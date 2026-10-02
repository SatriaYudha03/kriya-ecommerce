package service

import (
	"crypto/sha512"
	"encoding/hex"
	"errors"
	"net/http"
	"net/http/httptest"
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

func TestGetTransactionStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if user, _, ok := r.BasicAuth(); !ok || user != "SB-Mid-server-testkey" {
			t.Errorf("basic auth server key tidak dikirim")
		}
		switch r.URL.Path {
		case "/v2/KRIYA-PAID0001/status":
			_, _ = w.Write([]byte(`{"order_id":"KRIYA-PAID0001","status_code":"200","transaction_status":"settlement"}`))
		case "/v2/KRIYA-NONE0001/status":
			_, _ = w.Write([]byte(`{"status_code":"404","status_message":"Transaction doesn't exist."}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
		}
	}))
	defer srv.Close()

	svc := NewMidtransService("SB-Mid-server-testkey", "SB-Mid-client-testkey")
	svc.coreBaseURL = srv.URL

	st, err := svc.GetTransactionStatus("KRIYA-PAID0001")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if st.TransactionStatus != "settlement" {
		t.Fatalf("transaction_status = %q; want settlement", st.TransactionStatus)
	}

	if _, err := svc.GetTransactionStatus("KRIYA-NONE0001"); !errors.Is(err, ErrTransactionNotFound) {
		t.Fatalf("status_code 404 seharusnya ErrTransactionNotFound, dapat %v", err)
	}

	if _, err := svc.GetTransactionStatus("KRIYA-FAIL0001"); err == nil || errors.Is(err, ErrTransactionNotFound) {
		t.Fatalf("HTTP 500 seharusnya error biasa, dapat %v", err)
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
