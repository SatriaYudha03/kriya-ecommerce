package service

import (
	"crypto/sha512"
	"encoding/hex"
	"testing"
)

func TestVerifySignature(t *testing.T) {
	svc := NewMidtransService("SB-Mid-server-testkey", "SB-Mid-client-testkey")

	orderID := "KRIYA-ABCD1234"
	statusCode := "200"
	grossAmount := "150000.00"

	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + "SB-Mid-server-testkey"))
	validSignature := hex.EncodeToString(sum[:])

	if !svc.VerifySignature(orderID, statusCode, grossAmount, validSignature) {
		t.Fatal("signature valid seharusnya diterima")
	}

	if svc.VerifySignature(orderID, statusCode, grossAmount, "signature-salah") {
		t.Fatal("signature salah seharusnya ditolak")
	}

	if svc.VerifySignature(orderID, "201", grossAmount, validSignature) {
		t.Fatal("status_code berbeda seharusnya membuat signature tidak valid")
	}

	if svc.VerifySignature(orderID, statusCode, "999999.00", validSignature) {
		t.Fatal("gross_amount berbeda seharusnya membuat signature tidak valid")
	}
}

func TestMapTransactionStatus(t *testing.T) {
	cases := map[string]string{
		"capture":    "paid",
		"settlement": "paid",
		"pending":    "pending_payment",
		"deny":       "cancelled",
		"cancel":     "cancelled",
		"expire":     "expired",
	}
	for input, want := range cases {
		got, ok := MapTransactionStatus(input)
		if !ok || got != want {
			t.Fatalf("MapTransactionStatus(%q) = %q, %v; want %q, true", input, got, ok, want)
		}
	}

	if _, ok := MapTransactionStatus("unknown_status"); ok {
		t.Fatal("status tidak dikenal seharusnya ok=false")
	}
}

func TestGenerateOrderID(t *testing.T) {
	id, err := GenerateOrderID()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(id) != len("KRIYA-")+8 {
		t.Fatalf("panjang order_id salah: %q", id)
	}
	if id[:6] != "KRIYA-" {
		t.Fatalf("order_id harus berawalan KRIYA-: %q", id)
	}
}
