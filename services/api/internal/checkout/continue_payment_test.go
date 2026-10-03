package checkout

import (
	"errors"
	"testing"
	"time"
)

func TestPlanContinuePayment(t *testing.T) {
	now := time.Date(2026, 10, 3, 10, 0, 0, 0, time.UTC)
	due := now.Add(time.Hour)
	token := "snap-abc"
	empty := ""
	future := now.Add(30 * time.Minute)
	past := now.Add(-time.Minute)

	cases := []struct {
		name    string
		status  Status
		due     time.Time
		active  *continueAttempt
		want    continuePlan
		wantErr error
	}{
		{"bukan pending", StatusPaid, due, nil, continuePlan{}, ErrOrderNotPayable},
		{"tenggat lewat", StatusPendingPayment, now.Add(-time.Second), nil, continuePlan{}, ErrPaymentWindowClosed},
		{"sisa waktu < 2 menit", StatusPendingPayment, now.Add(90 * time.Second), nil, continuePlan{}, ErrPaymentWindowClosed},
		{"tanpa attempt aktif -> buat baru", StatusPendingPayment, due, nil, continuePlan{}, nil},
		{"attempt sehat -> pakai ulang", StatusPendingPayment, due,
			&continueAttempt{ID: "a1", SnapToken: &token, ExpiresAt: &future}, continuePlan{Reuse: true}, nil},
		{"token NULL (T3) -> ganti", StatusPendingPayment, due,
			&continueAttempt{ID: "a1", SnapToken: nil, ExpiresAt: &future}, continuePlan{Supersede: true}, nil},
		{"token kosong -> ganti", StatusPendingPayment, due,
			&continueAttempt{ID: "a1", SnapToken: &empty, ExpiresAt: &future}, continuePlan{Supersede: true}, nil},
		{"attempt kedaluwarsa (data lama) -> ganti", StatusPendingPayment, due,
			&continueAttempt{ID: "a1", SnapToken: &token, ExpiresAt: &past}, continuePlan{Supersede: true}, nil},
	}
	for _, c := range cases {
		got, err := planContinuePayment(now, c.status, c.due, c.active)
		if !errors.Is(err, c.wantErr) {
			t.Errorf("%s: err = %v; want %v", c.name, err, c.wantErr)
			continue
		}
		if got != c.want {
			t.Errorf("%s: plan = %+v; want %+v", c.name, got, c.want)
		}
	}
}

func TestSnapExpiryMinutes(t *testing.T) {
	now := time.Date(2026, 10, 3, 10, 0, 0, 0, time.UTC)
	cases := []struct {
		due  time.Time
		want int
	}{
		{now.Add(24 * time.Hour), 1440},
		{now.Add(90*time.Minute + 59*time.Second), 90}, // dibulatkan ke bawah
		{now.Add(30 * time.Second), 1},
	}
	for _, c := range cases {
		if got := snapExpiryMinutes(now, c.due); got != c.want {
			t.Errorf("snapExpiryMinutes(%s) = %d; want %d", c.due.Sub(now), got, c.want)
		}
	}
}
