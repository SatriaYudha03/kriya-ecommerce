package checkout

import "testing"

// TestCanTransition menguji seluruh sel tabel RENCANA-ECOMMERCE-V2.md §6.1, termasuk
// aktor yang ditolak di tiap sel dan pasangan (from,to) yang tidak ada di tabel sama sekali.
func TestCanTransition(t *testing.T) {
	allActors := []ActorType{ActorCustomer, ActorAdmin, ActorSystem, ActorPaymentGateway}

	type cell struct {
		from, to    Status
		allowActors []ActorType
	}
	cells := []cell{
		{StatusPendingPayment, StatusPaid, []ActorType{ActorPaymentGateway}},
		{StatusPendingPayment, StatusCancelled, []ActorType{ActorCustomer, ActorAdmin, ActorPaymentGateway}},
		{StatusPendingPayment, StatusExpired, []ActorType{ActorPaymentGateway, ActorSystem}},
		{StatusPaid, StatusProcessing, []ActorType{ActorAdmin}},
		{StatusPaid, StatusShipped, []ActorType{ActorAdmin}},
		{StatusPaid, StatusRefunded, []ActorType{ActorAdmin}},
		{StatusProcessing, StatusShipped, []ActorType{ActorAdmin}},
		{StatusProcessing, StatusRefunded, []ActorType{ActorAdmin}},
		{StatusShipped, StatusCompleted, []ActorType{ActorAdmin, ActorSystem}},
		{StatusShipped, StatusRefunded, []ActorType{ActorAdmin}},
		{StatusCompleted, StatusRefunded, []ActorType{ActorAdmin}},
	}

	allowedSet := func(c cell, actor ActorType) bool {
		for _, a := range c.allowActors {
			if a == actor {
				return true
			}
		}
		return false
	}

	for _, c := range cells {
		for _, actor := range allActors {
			want := allowedSet(c, actor)
			got := CanTransition(c.from, c.to, actor)
			if got != want {
				t.Errorf("CanTransition(%s, %s, %s) = %v; want %v", c.from, c.to, actor, got, want)
			}
		}
	}

	// Pasangan (from,to) yang sama sekali tidak ada di tabel §6.1 — harus selalu false,
	// walau dicoba oleh admin (mis. paid tidak pernah bisa cancelled, hanya refunded).
	notInTable := []struct{ from, to Status }{
		{StatusPaid, StatusCancelled},
		{StatusPaid, StatusExpired},
		{StatusPaid, StatusCompleted},
		{StatusProcessing, StatusCancelled},
		{StatusProcessing, StatusPaid},
		{StatusShipped, StatusCancelled},
		{StatusShipped, StatusProcessing},
		{StatusCompleted, StatusCancelled},
		{StatusCompleted, StatusShipped},
		{StatusCancelled, StatusPaid},
		{StatusCancelled, StatusProcessing},
		{StatusExpired, StatusPaid},
		{StatusRefunded, StatusPaid},
	}
	for _, p := range notInTable {
		for _, actor := range allActors {
			if CanTransition(p.from, p.to, actor) {
				t.Errorf("CanTransition(%s, %s, %s) = true; want false (tidak ada di tabel §6.1)", p.from, p.to, actor)
			}
		}
	}
}
