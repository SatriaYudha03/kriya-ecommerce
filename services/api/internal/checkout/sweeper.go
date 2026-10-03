package checkout

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
)

// SweeperConfig — RENCANA-PAYMENT-LIFECYCLE Fase 5. Interval <= 0 mematikan sweeper.
// Grace memberi waktu webhook Midtrans yang telat sebelum order di-expire sistem.
type SweeperConfig struct {
	Interval  time.Duration
	Grace     time.Duration
	BatchSize int
}

// ExpirySweeper meng-expire order pending_payment yang melewati payment_due_at — order
// yang tidak pernah punya transaksi Midtrans (popup Snap ditutup tanpa memilih metode)
// tidak akan pernah menerima webhook expire, jadi tanpa ini stok & kupon tertahan selamanya.
type ExpirySweeper struct {
	db        *gorm.DB
	midtrans  *service.MidtransService
	ports     Ports
	processor *PaymentProcessor
	cfg       SweeperConfig
}

func NewExpirySweeper(db *gorm.DB, midtrans *service.MidtransService, ports Ports, processor *PaymentProcessor, cfg SweeperConfig) *ExpirySweeper {
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 50
	}
	return &ExpirySweeper{db: db, midtrans: midtrans, ports: ports, processor: processor, cfg: cfg}
}

// Run berjalan sampai ctx dibatalkan (graceful shutdown). Aman dijalankan di banyak
// replika: Transition mengunci baris order dan CanTransition menolak expire ganda.
func (s *ExpirySweeper) Run(ctx context.Context) {
	if s.cfg.Interval <= 0 {
		log.Println("payment sweeper: nonaktif (PAYMENT_SWEEP_INTERVAL <= 0)")
		return
	}
	log.Printf("payment sweeper: aktif, interval %s, grace %s", s.cfg.Interval, s.cfg.Grace)
	ticker := time.NewTicker(s.cfg.Interval)
	defer ticker.Stop()
	for {
		s.SweepOnce(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// SweepOnce memproses satu batch order yang lewat tenggat. Mengembalikan jumlah order
// yang di-expire (untuk log/tes).
func (s *ExpirySweeper) SweepOnce(ctx context.Context) int {
	var ids []string
	cutoff := time.Now().Add(-s.cfg.Grace)
	if err := s.db.WithContext(ctx).Table("orders").
		Where("status = ? AND payment_due_at < ?", string(StatusPendingPayment), cutoff).
		Order("payment_due_at ASC").Limit(s.cfg.BatchSize).Pluck("id", &ids).Error; err != nil {
		if ctx.Err() == nil {
			log.Printf("payment sweeper: gagal mengambil order: %v", err)
		}
		return 0
	}
	expired := 0
	for _, id := range ids {
		if ctx.Err() != nil {
			break
		}
		ok, err := s.sweepOrder(ctx, id)
		if err != nil {
			log.Printf("payment sweeper: order %s dilewati: %v", id, err)
			continue
		}
		if ok {
			expired++
		}
	}
	if expired > 0 {
		log.Printf("payment sweeper: %d order di-expire", expired)
	}
	return expired
}

// attemptCheck — hasil menanyakan satu midtrans_order_id ke Midtrans.
type attemptCheck struct {
	MidtransOrderID string
	Status          *service.TransactionStatus // nil bila NotFound/Err
	NotFound        bool
	Err             error
}

type sweepDecision struct {
	Paid     *attemptCheck // ada attempt lunas: terapkan, jangan expire
	ToCancel []string      // attempt masih pending di Midtrans: cancel dulu sebelum expire
	Blocked  error         // status belum pasti: lewati order ini, coba tick berikutnya
}

// decideSweep — fungsi murni. Prinsip: order hanya boleh di-expire bila TIDAK ADA attempt
// yang masih bisa (atau sudah) dibayar.
func decideSweep(checks []attemptCheck) sweepDecision {
	var d sweepDecision
	for i := range checks {
		ch := &checks[i]
		if ch.Status == nil {
			continue
		}
		if mapped, ok := service.MapTransactionStatus(ch.Status.TransactionStatus); ok && mapped == string(StatusPaid) {
			return sweepDecision{Paid: ch}
		}
	}
	for _, ch := range checks {
		switch {
		case ch.Err != nil:
			d.Blocked = ch.Err
		case ch.NotFound:
		default:
			mapped, ok := service.MapTransactionStatus(ch.Status.TransactionStatus)
			switch {
			case !ok:
				d.Blocked = errors.New("status Midtrans tidak dikenal: " + ch.Status.TransactionStatus)
			case mapped == string(StatusPendingPayment):
				d.ToCancel = append(d.ToCancel, ch.MidtransOrderID)
			}
		}
	}
	return d
}

func (s *ExpirySweeper) sweepOrder(ctx context.Context, orderID string) (bool, error) {
	if err := ClosePayableAttempts(ctx, s.db, s.midtrans, s.processor, orderID); err != nil {
		if errors.Is(err, ErrOrderAlreadyPaid) {
			return false, nil // webhook telat: order kini lunas, bukan expired
		}
		return false, err
	}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		_, transErr := Transition(ctx, tx, s.ports, TransitionInput{
			OrderID: orderID, To: StatusExpired, Actor: ActorSystem,
			Note: "Batas waktu pembayaran habis",
		})
		return transErr
	})
	var invalidErr *InvalidTransitionError
	if errors.As(err, &invalidErr) {
		// Sudah dipindah jalur lain (webhook/batal/replika lain) — bukan kegagalan.
		return false, nil
	}
	return err == nil, err
}
