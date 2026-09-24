package orderflow

import "github.com/kriya-commerce/api/internal/checkout"

type Status string

const (
	StatusPendingPayment Status = "pending_payment"
	StatusPaid           Status = "paid"
	StatusProcessing     Status = "processing"
	StatusShipped        Status = "shipped"
	StatusCompleted      Status = "completed"
	StatusCancelled      Status = "cancelled"
	StatusExpired        Status = "expired"
	StatusRefunded       Status = "refunded"
)

func CanTransition(from, to Status, actor checkout.ActorType) bool {
	switch from {
	case StatusPendingPayment:
		return (to == StatusPaid && actor == checkout.ActorPaymentGateway) ||
			(to == StatusCancelled && actor == checkout.ActorCustomer) ||
			(to == StatusExpired && (actor == checkout.ActorSystem || actor == checkout.ActorPaymentGateway))
	case StatusPaid:
		return (to == StatusProcessing && actor == checkout.ActorAdmin) ||
			(to == StatusCancelled && actor == checkout.ActorAdmin) ||
			(to == StatusRefunded && actor == checkout.ActorAdmin)
	case StatusProcessing:
		return (to == StatusShipped && actor == checkout.ActorAdmin) ||
			(to == StatusCancelled && actor == checkout.ActorAdmin) ||
			(to == StatusRefunded && actor == checkout.ActorAdmin)
	case StatusShipped:
		return (to == StatusCompleted && (actor == checkout.ActorCustomer || actor == checkout.ActorSystem)) ||
			(to == StatusRefunded && actor == checkout.ActorAdmin)
	}
	return false
}
