package checkout

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
)

var (
	// ErrOrderAlreadyPaid — ternyata ada attempt yang sudah lunas di Midtrans (statusnya
	// sudah diterapkan ke order lewat PaymentProcessor); order tidak boleh ditutup.
	ErrOrderAlreadyPaid = errors.New("pesanan ternyata sudah dibayar")
	// ErrPaymentStillPayable — status Midtrans belum pasti atau pembatalan gagal; order
	// tidak boleh ditutup karena pembeli mungkin masih bisa membayar.
	ErrPaymentStillPayable = errors.New("transaksi pembayaran belum bisa dipastikan batal")
)

// ClosePayableAttempts memastikan TIDAK ADA attempt order ini yang masih bisa dibayar di
// Midtrans, SEBELUM order ditutup (cancelled/expired) — RENCANA-PAYMENT-LIFECYCLE "celah 1".
// Dipakai sweeper (expire) dan pembatalan oleh pembeli. Urutan: tanya status tiap attempt
// -> decideSweep -> lunas: terapkan + ErrOrderAlreadyPaid; belum pasti: ErrPaymentStillPayable;
// masih pending: cancel di Midtrans, gagal -> ErrPaymentStillPayable. nil = aman ditutup.
// Dipanggil di luar transaksi DB (memanggil HTTP Midtrans).
func ClosePayableAttempts(ctx context.Context, db *gorm.DB, midtrans *service.MidtransService, processor *PaymentProcessor, orderID string) error {
	mids, err := openMidtransOrderIDs(ctx, db, orderID)
	if err != nil {
		return err
	}
	checks := make([]attemptCheck, 0, len(mids))
	for _, mid := range mids {
		st, stErr := midtrans.GetTransactionStatus(mid)
		switch {
		case errors.Is(stErr, service.ErrTransactionNotFound):
			checks = append(checks, attemptCheck{MidtransOrderID: mid, NotFound: true})
		case stErr != nil:
			checks = append(checks, attemptCheck{MidtransOrderID: mid, Err: stErr})
		default:
			checks = append(checks, attemptCheck{MidtransOrderID: mid, Status: st})
		}
	}

	d := decideSweep(checks)
	if d.Paid != nil {
		// Webhook settlement belum sampai: terapkan sekarang lewat jalur yang sama.
		raw, _ := json.Marshal(d.Paid.Status)
		if err := processor.Apply(ctx, PaymentNotification{
			MidtransOrderID: d.Paid.MidtransOrderID, TransactionStatus: d.Paid.Status.TransactionStatus,
			GrossAmount: d.Paid.Status.GrossAmount, Raw: raw,
		}); err != nil {
			return err
		}
		return ErrOrderAlreadyPaid
	}
	if d.Blocked != nil {
		return fmt.Errorf("%w: %v", ErrPaymentStillPayable, d.Blocked)
	}
	for _, mid := range d.ToCancel {
		if err := midtrans.CancelTransaction(mid); err != nil && !errors.Is(err, service.ErrTransactionNotFound) {
			return fmt.Errorf("%w: cancel %s: %v", ErrPaymentStillPayable, mid, err)
		}
	}
	return nil
}
