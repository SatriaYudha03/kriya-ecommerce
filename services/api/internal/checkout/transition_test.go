package checkout

import (
	"errors"
	"testing"
)

func strPtr(s string) *string { return &s }

func TestPlanTransition_InvalidTransition(t *testing.T) {
	_, err := planTransition(StatusPaid, TransitionInput{
		OrderID: "o1", To: StatusCancelled, Actor: ActorAdmin,
	})
	var invalidErr *InvalidTransitionError
	if err == nil {
		t.Fatal("expected InvalidTransitionError, got nil")
	}
	if !errors.As(err, &invalidErr) {
		t.Fatalf("expected *InvalidTransitionError, got %T (%v)", err, err)
	}
	if invalidErr.From != StatusPaid || invalidErr.To != StatusCancelled {
		t.Fatalf("unexpected From/To: %+v", invalidErr)
	}
}

func TestPlanTransition_WrongActor(t *testing.T) {
	_, err := planTransition(StatusPendingPayment, TransitionInput{
		OrderID: "o1", To: StatusPaid, Actor: ActorAdmin,
	})
	if err == nil {
		t.Fatal("admin tidak boleh memicu pending_payment->paid (hanya payment_gateway)")
	}
}

func TestPlanTransition_ShippedRequiresCourierAndTracking(t *testing.T) {
	_, err := planTransition(StatusProcessing, TransitionInput{
		OrderID: "o1", To: StatusShipped, Actor: ActorAdmin,
	})
	var missing *MissingShipmentInfoError
	if !errors.As(err, &missing) {
		t.Fatalf("expected *MissingShipmentInfoError tanpa courier/tracking, got %T (%v)", err, err)
	}

	_, err = planTransition(StatusProcessing, TransitionInput{
		OrderID: "o1", To: StatusShipped, Actor: ActorAdmin,
		Courier: strPtr("JNE"), TrackingNumber: nil,
	})
	if !errors.As(err, &missing) {
		t.Fatalf("expected *MissingShipmentInfoError tanpa tracking_number, got %T (%v)", err, err)
	}

	plan, err := planTransition(StatusProcessing, TransitionInput{
		OrderID: "o1", To: StatusShipped, Actor: ActorAdmin,
		Courier: strPtr("JNE"), TrackingNumber: strPtr("JNE123"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan.Update.Courier == nil || *plan.Update.Courier != "JNE" {
		t.Fatal("courier tidak tersimpan di update")
	}
	if plan.Update.TrackingNumber == nil || *plan.Update.TrackingNumber != "JNE123" {
		t.Fatal("tracking_number tidak tersimpan di update")
	}
	if plan.Update.ShippedAt == nil {
		t.Fatal("shipped_at wajib terisi")
	}
	if plan.Event.Note != "JNE123" {
		t.Fatalf("event note seharusnya berisi tracking number, got %q", plan.Event.Note)
	}
}

func TestPlanTransition_PaidConfirmsDiscount(t *testing.T) {
	plan, err := planTransition(StatusPendingPayment, TransitionInput{
		OrderID: "o1", To: StatusPaid, Actor: ActorPaymentGateway,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !plan.ConfirmDiscounts {
		t.Fatal("paid harus men-Confirm kupon (§6.1)")
	}
	if plan.ReleaseInventory || plan.ReleaseDiscounts {
		t.Fatal("paid tidak boleh melepas stok/kupon")
	}
	if plan.Update.PaidAt == nil {
		t.Fatal("paid_at wajib terisi")
	}
}

func TestPlanTransition_CancelledReleasesStockAndCoupon(t *testing.T) {
	reason := "berubah pikiran"
	plan, err := planTransition(StatusPendingPayment, TransitionInput{
		OrderID: "o1", To: StatusCancelled, Actor: ActorCustomer, CancelReason: &reason,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !plan.ReleaseInventory || !plan.ReleaseDiscounts {
		t.Fatal("cancelled harus melepas stok & kupon (§6.1)")
	}
	if plan.ConfirmDiscounts {
		t.Fatal("cancelled tidak boleh men-Confirm kupon")
	}
	if plan.Update.CancelledAt == nil {
		t.Fatal("cancelled_at wajib terisi")
	}
	if plan.Update.CancelReason == nil || *plan.Update.CancelReason != reason {
		t.Fatal("cancel_reason tidak tersimpan")
	}
	if plan.Event.Note != reason {
		t.Fatalf("event note seharusnya berisi alasan pembatalan, got %q", plan.Event.Note)
	}
}

func TestPlanTransition_ExpiredReleasesStockAndCoupon(t *testing.T) {
	plan, err := planTransition(StatusPendingPayment, TransitionInput{
		OrderID: "o1", To: StatusExpired, Actor: ActorPaymentGateway,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !plan.ReleaseInventory || !plan.ReleaseDiscounts {
		t.Fatal("expired harus melepas stok & kupon (§6.1)")
	}
}

func TestPlanTransition_ShippedToCompletedBySystem(t *testing.T) {
	plan, err := planTransition(StatusShipped, TransitionInput{
		OrderID: "o1", To: StatusCompleted, Actor: ActorSystem,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan.Update.CompletedAt == nil {
		t.Fatal("completed_at wajib terisi")
	}
}

func TestPlanTransition_EventAlwaysNotifiesCustomer(t *testing.T) {
	plan, err := planTransition(StatusPaid, TransitionInput{
		OrderID: "o1", To: StatusProcessing, Actor: ActorAdmin,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !plan.Event.NotifyCustomer {
		t.Fatal("setiap transisi harus membuat notifikasi customer (§6.1)")
	}
	if plan.Event.FromStatus == nil || *plan.Event.FromStatus != string(StatusPaid) {
		t.Fatal("from_status event tidak sesuai")
	}
	if plan.Event.ToStatus != string(StatusProcessing) {
		t.Fatal("to_status event tidak sesuai")
	}
}
