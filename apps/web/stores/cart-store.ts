import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/customer/types";
import { getCart, updateCart, mergeCart } from "@/lib/customer/api";

interface CartState {
  items: CartItem[];
  total: number;
  loading: boolean;
  addItem: (item: Omit<CartItem, "subtotal" | "stock"> & { stock?: number }) => Promise<void>;
  updateQty: (variantId: string, qty: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  mergeWithServer: () => Promise<void>;
}

// Perubahan keranjang bersifat optimistis: UI langsung berubah dan sinkronisasi ke server
// di-debounce, jadi klik +/- beruntun hanya mengirim satu PUT. Stok/harga dari respons
// server diterapkan sebagai koreksi, tanpa menimpa qty yang baru diketik pengguna.
const SYNC_DELAY_MS = 400;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncSeq = 0;

function sumSubtotal(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.subtotal, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      const flush = async () => {
        syncTimer = null;
        const seq = ++syncSeq;
        const payload = get().items.map((i) => ({ variant_id: i.variant_id, qty: i.qty }));
        try {
          const cart = await updateCart(payload);
          if (seq !== syncSeq || syncTimer) return; // ada perubahan lebih baru
          const fresh = new Map(cart.items.map((i) => [i.variant_id, i]));
          const items = get().items.map((i) => {
            const f = fresh.get(i.variant_id);
            return f ? { ...i, price: f.price, stock: f.stock, subtotal: f.price * i.qty } : i;
          });
          set({ items, total: sumSubtotal(items) });
        } catch {
          // Server menolak (mis. 409 stok tidak cukup) atau jaringan gagal: tarik state
          // server sebagai kebenaran, sehingga qty kembali ke nilai valid beserta stok terbaru.
          if (seq !== syncSeq || syncTimer) return;
          try {
            const cart = await getCart();
            if (seq !== syncSeq || syncTimer) return;
            set({ items: cart.items, total: cart.total });
          } catch {
            // Akan disinkronkan lagi pada perubahan/sync berikutnya
          }
        }
      };
      const scheduleSync = () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(flush, SYNC_DELAY_MS);
      };

      return {
      items: [],
      total: 0,
      loading: false,

      addItem: async (newItem) => {
        const { items } = get();
        const existing = items.find((i) => i.variant_id === newItem.variant_id);

        let newItems: CartItem[];
        if (existing) {
          const qty = Math.min(existing.qty + newItem.qty, existing.stock);
          newItems = items.map((i) =>
            i.variant_id === newItem.variant_id ? { ...i, qty, subtotal: i.price * qty } : i
          );
        } else {
          const stock = newItem.stock ?? 999;
          const qty = Math.min(newItem.qty, stock);
          newItems = [...items, { ...newItem, stock, qty, subtotal: newItem.price * qty }];
        }

        set({ items: newItems, total: sumSubtotal(newItems) });
        scheduleSync();
      },

      updateQty: async (variantId, qty) => {
        if (qty <= 0) return get().removeItem(variantId);
        const newItems = get().items.map((i) => {
          if (i.variant_id !== variantId) return i;
          // Naik melebihi stok ditolak; turun selalu boleh (mis. stok sudah menyusut).
          const next = qty > i.qty ? Math.min(qty, i.stock) : qty;
          return { ...i, qty: next, subtotal: i.price * next };
        });
        set({ items: newItems, total: sumSubtotal(newItems) });
        scheduleSync();
      },

      removeItem: async (variantId) => {
        const newItems = get().items.filter((i) => i.variant_id !== variantId);
        set({ items: newItems, total: sumSubtotal(newItems) });
        scheduleSync();
      },

      clearCart: async () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = null;
        syncSeq++;
        set({ loading: true, items: [], total: 0 });
        try {
          await updateCart([]);
        } catch {
        } finally {
          set({ loading: false });
        }
      },

      syncFromServer: async () => {
        set({ loading: true });
        try {
          const { items } = get();
          if (items.length > 0) {
            const reqItems = items.map((i) => ({ variant_id: i.variant_id, qty: i.qty }));
            const cart = await mergeCart(reqItems);
            set({ items: cart.items, total: cart.total });
          } else {
            const cart = await getCart();
            set({ items: cart.items, total: cart.total });
          }
        } catch {
          console.error("Failed to sync cart");
        } finally {
          set({ loading: false });
        }
      },

      mergeWithServer: async () => {
        set({ loading: true });
        try {
          const { items } = get();
          const reqItems = items.map((i) => ({ variant_id: i.variant_id, qty: i.qty }));
          const cart = await mergeCart(reqItems);
          set({ items: cart.items, total: cart.total });
        } catch {
          console.error("Failed to merge cart");
        } finally {
          set({ loading: false });
        }
      },
      };
    },
    {
      name: "kriya-cart",
      // Only persist items and total, not loading state
      partialize: (state) => ({ items: state.items, total: state.total }),
    }
  )
);

