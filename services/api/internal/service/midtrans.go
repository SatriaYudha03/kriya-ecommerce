package service

import (
	"bytes"
	"crypto/rand"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

// snapSandboxURL — KRIYA-MASTER.md Bagian 2: Midtrans Snap mode Sandbox (bukan konfigurasi, fixed).
const snapSandboxURL = "https://app.sandbox.midtrans.com/snap/v1/transactions"
const midtransCancelSandboxURL = "https://api.sandbox.midtrans.com/v2/%s/cancel"

const orderIDCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

type MidtransService struct {
	serverKey string
	clientKey string
	client    *http.Client
}

func NewMidtransService(serverKey, clientKey string) *MidtransService {
	return &MidtransService{
		serverKey: serverKey,
		clientKey: clientKey,
		client:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *MidtransService) ClientKey() string { return s.clientKey }

// GenerateOrderID membuat order_id format KRIYA-{8 char acak} (KRIYA-MASTER.md Bagian Midtrans).
func GenerateOrderID() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	out := make([]byte, 8)
	for i, v := range b {
		out[i] = orderIDCharset[int(v)%len(orderIDCharset)]
	}
	return "KRIYA-" + string(out), nil
}

type snapTransactionDetails struct {
	OrderID     string `json:"order_id"`
	GrossAmount int    `json:"gross_amount"`
}

type snapExpiry struct {
	Unit     string `json:"unit"`
	Duration int    `json:"duration"`
}

type snapRequest struct {
	TransactionDetails snapTransactionDetails `json:"transaction_details"`
	Expiry             *snapExpiry            `json:"expiry,omitempty"`
}

type snapResponse struct {
	Token       string `json:"token"`
	RedirectURL string `json:"redirect_url"`
}

// CreateSnapTransaction membuat transaksi Snap sandbox dan mengembalikan snap_token.
// Dipertahankan (jalur lama, expiry default Midtrans) — jalur baru (checkout v2)
// memakai CreateSnapTransactionWithExpiry agar expiry mengikuti store_settings.
func (s *MidtransService) CreateSnapTransaction(midtransOrderID string, grossAmount int) (string, error) {
	return s.doCreateSnapTransaction(midtransOrderID, grossAmount, nil)
}

// CreateSnapTransactionWithExpiry — sama seperti CreateSnapTransaction, tapi expiry
// transaksi Snap diset eksplisit dalam menit (RENCANA §4.5: dari store_settings.pending_payment_ttl_minutes).
func (s *MidtransService) CreateSnapTransactionWithExpiry(midtransOrderID string, grossAmount int, expiryMinutes int) (string, error) {
	var exp *snapExpiry
	if expiryMinutes > 0 {
		exp = &snapExpiry{Unit: "minute", Duration: expiryMinutes}
	}
	return s.doCreateSnapTransaction(midtransOrderID, grossAmount, exp)
}

func (s *MidtransService) doCreateSnapTransaction(midtransOrderID string, grossAmount int, expiry *snapExpiry) (string, error) {
	body, err := json.Marshal(snapRequest{
		TransactionDetails: snapTransactionDetails{
			OrderID:     midtransOrderID,
			GrossAmount: grossAmount,
		},
		Expiry: expiry,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest(http.MethodPost, snapSandboxURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(s.serverKey, "")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 300 {
		return "", errors.New("midtrans snap error: " + string(respBody))
	}

	var snapResp snapResponse
	if err := json.Unmarshal(respBody, &snapResp); err != nil {
		return "", err
	}
	if snapResp.Token == "" {
		return "", errors.New("midtrans snap: token kosong")
	}
	return snapResp.Token, nil
}

// CancelTransaction membatalkan transaksi Midtrans (dipakai D3, best-effort — dipanggil
// di luar transaksi DB, kegagalannya tidak boleh menggagalkan pembatalan order).
func (s *MidtransService) CancelTransaction(midtransOrderID string) error {
	url := fmt.Sprintf(midtransCancelSandboxURL, midtransOrderID)
	req, err := http.NewRequest(http.MethodPost, url, nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(s.serverKey, "")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return errors.New("midtrans cancel error: " + string(respBody))
	}
	return nil
}

// VerifySignature memverifikasi signature_key webhook Midtrans:
// SHA-512(order_id + status_code + gross_amount + ServerKey).
// grossAmount HARUS string persis seperti dikirim Midtrans (mis. "150000.00").
func (s *MidtransService) VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + s.serverKey))
	expected := hex.EncodeToString(sum[:])
	return expected == signatureKey
}

// MapTransactionStatus memetakan transaction_status Midtrans ke status order KRIYA
// (KRIYA-MASTER.md Bagian Midtrans).
func MapTransactionStatus(transactionStatus string) (orderStatus string, ok bool) {
	switch transactionStatus {
	case "capture", "settlement":
		return "paid", true
	case "pending":
		return "pending_payment", true
	case "deny", "cancel":
		return "cancelled", true
	case "expire":
		return "expired", true
	default:
		return "", false
	}
}
