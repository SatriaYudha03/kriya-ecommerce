package checkout

import "testing"

func TestAttemptStatusFor(t *testing.T) {
	cases := map[string]string{
		"paid":            "settled",
		"cancelled":       "failed",
		"expired":         "expired",
		"pending_payment": "active",
	}
	for orderStatus, want := range cases {
		if got := attemptStatusFor(orderStatus); got != want {
			t.Errorf("attemptStatusFor(%q) = %q; want %q", orderStatus, got, want)
		}
	}
}
