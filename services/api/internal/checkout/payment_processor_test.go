package checkout

import "testing"

// RENCANA-PAYMENT-LIFECYCLE Fase 4 — tabel klasifikasi notifikasi.
func TestClassifyNotification(t *testing.T) {
	cases := []struct {
		name        string
		order       Status
		mapped      Status
		attemptPrev string
		want        notificationAction
		wantKind    string
	}{
		{"bayar normal", StatusPendingPayment, StatusPaid, "active", actionTransition, ""},
		{"bayar lewat attempt superseded", StatusPendingPayment, StatusPaid, "superseded", actionTransition, ""},
		{"settlement duplikat", StatusPaid, StatusPaid, "settled", actionIgnore, ""},
		{"duplikat setelah dikirim", StatusShipped, StatusPaid, "settled", actionIgnore, ""},
		{"bayar setelah batal", StatusCancelled, StatusPaid, "failed", actionAnomaly, AnomalyPaidAfterClose},
		{"bayar setelah expired", StatusExpired, StatusPaid, "expired", actionAnomaly, AnomalyPaidAfterClose},
		{"bayar dobel (attempt lain)", StatusPaid, StatusPaid, "superseded", actionAnomaly, AnomalyDoublePayment},
		{"bayar dobel setelah selesai", StatusCompleted, StatusPaid, "active", actionAnomaly, AnomalyDoublePayment},
		{"expire attempt aktif", StatusPendingPayment, StatusExpired, "active", actionTransition, ""},
		{"cancel attempt aktif", StatusPendingPayment, StatusCancelled, "active", actionTransition, ""},
		{"expire attempt lama tidak mematikan order", StatusPendingPayment, StatusExpired, "superseded", actionUpdateAttemptOnly, ""},
		{"expire untuk order yang sudah expired", StatusExpired, StatusExpired, "expired", actionUpdateAttemptOnly, ""},
		{"cancel atas attempt yang sudah settled", StatusPaid, StatusCancelled, "settled", actionIgnore, ""},
		{"pending tidak mengubah apa pun", StatusPendingPayment, StatusPendingPayment, "active", actionIgnore, ""},
	}
	for _, c := range cases {
		got := classifyNotification(c.order, c.mapped, c.attemptPrev)
		if got.Action != c.want || got.AnomalyKind != c.wantKind {
			t.Errorf("%s: got %+v; want action=%d kind=%q", c.name, got, c.want, c.wantKind)
		}
	}
}

func TestLegacyPrevStatus(t *testing.T) {
	cases := map[string]string{
		"settlement": "settled",
		"capture":    "settled",
		"pending":    "active",
		"expire":     "expired",
		"cancel":     "failed",
		"aneh":       "active",
	}
	for in, want := range cases {
		if got := legacyPrevStatus(in); got != want {
			t.Errorf("legacyPrevStatus(%q) = %q; want %q", in, got, want)
		}
	}
}
