package checkout

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func mapErrAndGetStatus(t *testing.T, err error) (int, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	mapCreateOrderError(c, err)
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	return w.Code, body.Error.Code
}

func TestMapCreateOrderError_StockProblem(t *testing.T) {
	status, code := mapErrAndGetStatus(t, &StockProblemError{Problems: []Problem{{VariantID: "v1", Code: "insufficient_stock"}}})
	if status != http.StatusConflict || code != "conflict" {
		t.Fatalf("got status=%d code=%q, want 409/conflict", status, code)
	}
}

func TestMapCreateOrderError_CouponInvalid(t *testing.T) {
	status, code := mapErrAndGetStatus(t, &CouponInvalidError{Reason: CouponExpired})
	if status != http.StatusConflict || code != "conflict" {
		t.Fatalf("got status=%d code=%q, want 409/conflict", status, code)
	}
}

func TestMapCreateOrderError_InsufficientStockRace(t *testing.T) {
	status, code := mapErrAndGetStatus(t, &InsufficientStockError{VariantID: "v1", Available: 0, Requested: 1})
	if status != http.StatusConflict || code != "conflict" {
		t.Fatalf("got status=%d code=%q, want 409/conflict", status, code)
	}
}

func TestMapCreateOrderError_AddressNotFound(t *testing.T) {
	status, code := mapErrAndGetStatus(t, ErrAddressNotFound)
	if status != http.StatusNotFound || code != "not_found" {
		t.Fatalf("got status=%d code=%q, want 404/not_found", status, code)
	}
}

func TestMapCreateOrderError_ShippingMethodUnavailable(t *testing.T) {
	status, code := mapErrAndGetStatus(t, ErrShippingMethodUnavailable)
	if status != http.StatusConflict || code != "conflict" {
		t.Fatalf("got status=%d code=%q, want 409/conflict", status, code)
	}
}

func TestMapCreateOrderError_Default(t *testing.T) {
	status, code := mapErrAndGetStatus(t, errors.New("boom"))
	if status != http.StatusInternalServerError || code != "internal" {
		t.Fatalf("got status=%d code=%q, want 500/internal", status, code)
	}
}
