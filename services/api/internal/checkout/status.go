package checkout

// Status, CanTransition, dan Transition (transition.go) awalnya dirancang sebagai
// package terpisah internal/orderflow (RENCANA §4.4), tapi orderflow.TransitionInput
// memakai checkout.Ports/checkout.ActorType — kalau checkout balik meng-import orderflow
// untuk memanggil Transition dari webhook (§8.1 butir 3), terjadi import cycle. Karena
// webhook HARUS hidup di package checkout (§4.1) dan HARUS memanggil Transition,
// implementasi sebenarnya dipindah ke sini; internal/orderflow kini hanya re-export
// (type alias + wrapper) supaya kode yang sudah ada (aftersales D2/D3/D5) tetap
// kompatibel tanpa perubahan.
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

// CanTransition mengikuti persis tabel RENCANA-ECOMMERCE-V2.md §6.1. Sel yang tidak
// tercantum di tabel (mis. paid->cancelled, shipped->cancelled) selalu false — order yang
// sudah dibayar hanya bisa berakhir di refunded, tidak pernah kembali ke cancelled.
func CanTransition(from, to Status, actor ActorType) bool {
	switch from {
	case StatusPendingPayment:
		switch to {
		case StatusPaid:
			return actor == ActorPaymentGateway
		case StatusCancelled:
			return actor == ActorCustomer || actor == ActorAdmin || actor == ActorPaymentGateway
		case StatusExpired:
			return actor == ActorPaymentGateway
		}
	case StatusPaid:
		switch to {
		case StatusProcessing, StatusShipped, StatusRefunded:
			return actor == ActorAdmin
		}
	case StatusProcessing:
		switch to {
		case StatusShipped, StatusRefunded:
			return actor == ActorAdmin
		}
	case StatusShipped:
		switch to {
		case StatusCompleted:
			return actor == ActorAdmin || actor == ActorSystem
		case StatusRefunded:
			return actor == ActorAdmin
		}
	case StatusCompleted:
		return to == StatusRefunded && actor == ActorAdmin
	}
	return false
}
