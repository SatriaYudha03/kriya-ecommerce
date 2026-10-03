package checkout

import (
	"errors"
	"testing"

	"github.com/kriya-commerce/api/internal/service"
)

func st(status string) *service.TransactionStatus {
	return &service.TransactionStatus{TransactionStatus: status}
}

// RENCANA-PAYMENT-LIFECYCLE Fase 5 — order hanya di-expire bila tidak ada attempt yang
// masih bisa (atau sudah) dibayar.
func TestDecideSweep(t *testing.T) {
	t.Run("tanpa attempt -> expire", func(t *testing.T) {
		d := decideSweep(nil)
		if d.Paid != nil || d.Blocked != nil || len(d.ToCancel) != 0 {
			t.Fatalf("got %+v; want expire bersih", d)
		}
	})
	t.Run("popup ditutup tanpa memilih metode -> expire", func(t *testing.T) {
		d := decideSweep([]attemptCheck{{MidtransOrderID: "A", NotFound: true}})
		if d.Paid != nil || d.Blocked != nil || len(d.ToCancel) != 0 {
			t.Fatalf("got %+v; want expire bersih", d)
		}
	})
	t.Run("sudah expire/cancel di Midtrans -> expire", func(t *testing.T) {
		d := decideSweep([]attemptCheck{
			{MidtransOrderID: "A", Status: st("expire")},
			{MidtransOrderID: "B", Status: st("cancel")},
		})
		if d.Paid != nil || d.Blocked != nil || len(d.ToCancel) != 0 {
			t.Fatalf("got %+v; want expire bersih", d)
		}
	})
	t.Run("ada yang lunas -> terapkan, menang atas error", func(t *testing.T) {
		d := decideSweep([]attemptCheck{
			{MidtransOrderID: "A", Err: errors.New("timeout")},
			{MidtransOrderID: "B", Status: st("settlement")},
		})
		if d.Paid == nil || d.Paid.MidtransOrderID != "B" {
			t.Fatalf("got %+v; want Paid=B", d)
		}
	})
	t.Run("masih pending -> cancel dulu", func(t *testing.T) {
		d := decideSweep([]attemptCheck{
			{MidtransOrderID: "A", Status: st("pending")},
			{MidtransOrderID: "B", NotFound: true},
		})
		if d.Blocked != nil || len(d.ToCancel) != 1 || d.ToCancel[0] != "A" {
			t.Fatalf("got %+v; want ToCancel=[A]", d)
		}
	})
	t.Run("Midtrans tidak terjangkau -> lewati", func(t *testing.T) {
		d := decideSweep([]attemptCheck{{MidtransOrderID: "A", Err: errors.New("timeout")}})
		if d.Blocked == nil {
			t.Fatalf("got %+v; want Blocked", d)
		}
	})
	t.Run("status tidak dikenal -> lewati", func(t *testing.T) {
		d := decideSweep([]attemptCheck{{MidtransOrderID: "A", Status: st("authorize")}})
		if d.Blocked == nil {
			t.Fatalf("got %+v; want Blocked", d)
		}
	})
}
