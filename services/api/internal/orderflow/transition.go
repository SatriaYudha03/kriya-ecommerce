package orderflow

import (
	"context"
	"errors"
	"github.com/kriya-commerce/api/internal/checkout"
	"gorm.io/gorm"
)

type TransitionInput struct {
	OrderID        string
	To             Status
	Actor          checkout.ActorType
	ActorID        *string
	Note           string
	Courier        *string
	TrackingNumber *string
	CancelReason   *string
}

type InvalidTransitionError struct{ From, To Status }

func (e *InvalidTransitionError) Error() string { return "invalid transition" }

type MissingShipmentInfoError struct{}

func (e *MissingShipmentInfoError) Error() string { return "missing shipment info" }

func Transition(ctx context.Context, tx *gorm.DB, p checkout.Ports, in TransitionInput) (Status, error) {
	// Akan diimplementasikan
	return StatusPendingPayment, errors.New("not implemented")
}
