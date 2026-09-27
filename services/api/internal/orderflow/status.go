// Package orderflow adalah alias tipis di atas internal/checkout (lihat komentar di
// internal/checkout/status.go untuk alasan import-cycle-nya). Kode yang sudah memakai
// orderflow.Status / orderflow.CanTransition / orderflow.Transition (D2/D3/D5) tetap
// jalan tanpa perubahan.
package orderflow

import "github.com/kriya-commerce/api/internal/checkout"

type Status = checkout.Status

const (
	StatusPendingPayment = checkout.StatusPendingPayment
	StatusPaid           = checkout.StatusPaid
	StatusProcessing     = checkout.StatusProcessing
	StatusShipped        = checkout.StatusShipped
	StatusCompleted      = checkout.StatusCompleted
	StatusCancelled      = checkout.StatusCancelled
	StatusExpired        = checkout.StatusExpired
	StatusRefunded       = checkout.StatusRefunded
)

func CanTransition(from, to Status, actor checkout.ActorType) bool {
	return checkout.CanTransition(from, to, actor)
}
