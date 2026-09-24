package orderflow

import (
	"github.com/kriya-commerce/api/internal/checkout"
	"testing"
)

func TestCanTransition(t *testing.T) {
	tests := []struct {
		name     string
		from     Status
		to       Status
		actor    checkout.ActorType
		expected bool
	}{
		// From Pending Payment
		{"Pending -> Paid (Gateway)", StatusPendingPayment, StatusPaid, checkout.ActorPaymentGateway, true},
		{"Pending -> Cancelled (Customer)", StatusPendingPayment, StatusCancelled, checkout.ActorCustomer, true},
		{"Pending -> Expired (System)", StatusPendingPayment, StatusExpired, checkout.ActorSystem, true},
		{"Pending -> Expired (Gateway)", StatusPendingPayment, StatusExpired, checkout.ActorPaymentGateway, true},
		{"Pending -> Cancelled (System) - Invalid", StatusPendingPayment, StatusCancelled, checkout.ActorSystem, false},
		
		// From Paid
		{"Paid -> Processing (Admin)", StatusPaid, StatusProcessing, checkout.ActorAdmin, true},
		{"Paid -> Cancelled (Admin)", StatusPaid, StatusCancelled, checkout.ActorAdmin, true},
		{"Paid -> Refunded (Admin)", StatusPaid, StatusRefunded, checkout.ActorAdmin, true},
		{"Paid -> Processing (Customer) - Invalid", StatusPaid, StatusProcessing, checkout.ActorCustomer, false},
		
		// From Processing
		{"Processing -> Shipped (Admin)", StatusProcessing, StatusShipped, checkout.ActorAdmin, true},
		{"Processing -> Cancelled (Admin)", StatusProcessing, StatusCancelled, checkout.ActorAdmin, true},
		{"Processing -> Refunded (Admin)", StatusProcessing, StatusRefunded, checkout.ActorAdmin, true},
		
		// From Shipped
		{"Shipped -> Completed (Customer)", StatusShipped, StatusCompleted, checkout.ActorCustomer, true},
		{"Shipped -> Completed (System)", StatusShipped, StatusCompleted, checkout.ActorSystem, true},
		{"Shipped -> Refunded (Admin)", StatusShipped, StatusRefunded, checkout.ActorAdmin, true},
		{"Shipped -> Completed (Admin) - Invalid", StatusShipped, StatusCompleted, checkout.ActorAdmin, false},
		
		// Terminal states
		{"Completed -> Refunded (Admin) - Invalid", StatusCompleted, StatusRefunded, checkout.ActorAdmin, false},
		{"Cancelled -> Processing (Admin) - Invalid", StatusCancelled, StatusProcessing, checkout.ActorAdmin, false},
		{"Expired -> Paid (Gateway) - Invalid", StatusExpired, StatusPaid, checkout.ActorPaymentGateway, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CanTransition(tt.from, tt.to, tt.actor)
			if result != tt.expected {
				t.Errorf("CanTransition(%s, %s, %s) = %v; expected %v", tt.from, tt.to, tt.actor, result, tt.expected)
			}
		})
	}
}
