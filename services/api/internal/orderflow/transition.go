package orderflow

import (
	"context"

	"github.com/kriya-commerce/api/internal/checkout"
	"gorm.io/gorm"
)

type TransitionInput = checkout.TransitionInput
type InvalidTransitionError = checkout.InvalidTransitionError
type MissingShipmentInfoError = checkout.MissingShipmentInfoError

// Transition — lihat internal/checkout/transition.go untuk implementasi & dokumentasi
// sebenarnya. Alias ini ada supaya D2 (PUT /admin/orders/:id/status), D3 (batal
// customer), dan D5 (refund penuh) yang sudah memanggil orderflow.Transition tidak
// perlu diubah.
func Transition(ctx context.Context, tx *gorm.DB, p checkout.Ports, in TransitionInput) (Status, error) {
	return checkout.Transition(ctx, tx, p, in)
}
