package catalog

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"github.com/kriya-commerce/api/internal/checkout"
)

type StockMovement struct {
	ID         string    `json:"id" gorm:"primaryKey;default:gen_random_uuid()"`
	VariantID  string    `json:"variant_id"`
	Delta      int       `json:"delta"`
	StockAfter int       `json:"stock_after"`
	Reason     string    `json:"reason"`
	OrderID    *string   `json:"order_id,omitempty"`
	ActorID    *string   `json:"actor_id,omitempty"`
	Note       *string   `json:"note,omitempty"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime"`
}

type dbLedger struct{}

func NewInventoryLedger() checkout.InventoryLedger {
	return &dbLedger{}
}

func (l *dbLedger) Reserve(ctx context.Context, tx *gorm.DB, orderID string, lines []checkout.LineInput, actorID *string) error {
	if len(lines) == 0 {
		return nil
	}

	// Sort variant_id for lock order
	var variantIDs []string
	for _, line := range lines {
		variantIDs = append(variantIDs, line.VariantID)
	}

	type variantData struct {
		ID    string
		Stock int
	}
	var variants []variantData
	if err := tx.WithContext(ctx).Table("product_variants").
		Where("id IN ?", variantIDs).
		Order("id ASC").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id, stock").
		Scan(&variants).Error; err != nil {
		return err
	}

	variantMap := make(map[string]int)
	for _, v := range variants {
		variantMap[v.ID] = v.Stock
	}

	for _, line := range lines {
		currentStock, exists := variantMap[line.VariantID]
		if !exists {
			return fmt.Errorf("variant %s not found", line.VariantID)
		}
		if currentStock < line.Qty {
			return &checkout.InsufficientStockError{
				VariantID: line.VariantID,
				Available: currentStock,
				Requested: line.Qty,
			}
		}

		newStock := currentStock - line.Qty
		if err := tx.WithContext(ctx).Table("product_variants").
			Where("id = ?", line.VariantID).
			Update("stock", newStock).Error; err != nil {
			return err
		}

		movement := StockMovement{
			VariantID:  line.VariantID,
			Delta:      -line.Qty,
			StockAfter: newStock,
			Reason:     "order_reserved",
			OrderID:    &orderID,
			ActorID:    actorID,
		}
		if err := tx.WithContext(ctx).Create(&movement).Error; err != nil {
			return err
		}
		variantMap[line.VariantID] = newStock // Update map in case of duplicate lines (though shouldn't happen)
	}

	return nil
}

func (l *dbLedger) Release(ctx context.Context, tx *gorm.DB, orderID string, actorID *string) error {
	// IDEMPOTENCY CHECK
	var releaseCount int64
	if err := tx.WithContext(ctx).Table("stock_movements").
		Where("order_id = ? AND reason = 'order_released'", orderID).
		Count(&releaseCount).Error; err != nil {
		return err
	}
	if releaseCount > 0 {
		return nil // Already released
	}

	var reservations []StockMovement
	if err := tx.WithContext(ctx).Table("stock_movements").
		Where("order_id = ? AND reason = 'order_reserved'", orderID).
		Order("variant_id ASC"). // lock order via variant_id soon
		Scan(&reservations).Error; err != nil {
		return err
	}

	if len(reservations) == 0 {
		return nil // Nothing to release
	}

	var variantIDs []string
	qtyMap := make(map[string]int)
	for _, res := range reservations {
		variantIDs = append(variantIDs, res.VariantID)
		qtyMap[res.VariantID] += -res.Delta // Delta was negative
	}

	// Lock variants
	type variantData struct {
		ID    string
		Stock int
	}
	var variants []variantData
	if err := tx.WithContext(ctx).Table("product_variants").
		Where("id IN ?", variantIDs).
		Order("id ASC").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id, stock").
		Scan(&variants).Error; err != nil {
		return err
	}

	for _, v := range variants {
		qtyToRelease := qtyMap[v.ID]
		newStock := v.Stock + qtyToRelease
		if err := tx.WithContext(ctx).Table("product_variants").
			Where("id = ?", v.ID).
			Update("stock", newStock).Error; err != nil {
			return err
		}

		movement := StockMovement{
			VariantID:  v.ID,
			Delta:      qtyToRelease,
			StockAfter: newStock,
			Reason:     "order_released",
			OrderID:    &orderID,
			ActorID:    actorID,
		}
		if err := tx.WithContext(ctx).Create(&movement).Error; err != nil {
			return err
		}
	}

	return nil
}

func (l *dbLedger) Restock(ctx context.Context, tx *gorm.DB, orderID string, items []checkout.RestockItem, actorID *string, note string) error {
	if len(items) == 0 {
		return nil
	}
	
	var variantIDs []string
	for _, item := range items {
		variantIDs = append(variantIDs, item.VariantID)
	}

	// Lock variants
	type variantData struct {
		ID    string
		Stock int
	}
	var variants []variantData
	if err := tx.WithContext(ctx).Table("product_variants").
		Where("id IN ?", variantIDs).
		Order("id ASC").
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id, stock").
		Scan(&variants).Error; err != nil {
		return err
	}

	variantMap := make(map[string]int)
	for _, v := range variants {
		variantMap[v.ID] = v.Stock
	}

	for _, item := range items {
		currentStock, exists := variantMap[item.VariantID]
		if !exists {
			return fmt.Errorf("variant %s not found", item.VariantID)
		}

		newStock := currentStock + item.Qty
		if err := tx.WithContext(ctx).Table("product_variants").
			Where("id = ?", item.VariantID).
			Update("stock", newStock).Error; err != nil {
			return err
		}

		var notePtr *string
		if note != "" {
			notePtr = &note
		}

		movement := StockMovement{
			VariantID:  item.VariantID,
			Delta:      item.Qty,
			StockAfter: newStock,
			Reason:     "return_restock",
			OrderID:    &orderID,
			ActorID:    actorID,
			Note:       notePtr,
		}
		if err := tx.WithContext(ctx).Create(&movement).Error; err != nil {
			return err
		}
	}

	return nil
}
