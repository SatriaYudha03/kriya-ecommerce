import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/customer/types";
import { getCart, updateCart, mergeCart } from "@/lib/customer/api";

interface CartState {
  items: CartItem[];
  total: number;
  loading: boolean;
  addItem: (item: Omit<CartItem, "subtotal">) => Promise<void>;
  updateQty: (variantId: string, qty: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  mergeWithServer: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      loading: false,

      addItem: async (newItem) => {
        set({ loading: true });
        const { items } = get();
        const existing = items.find((i) => i.variant_id === newItem.variant_id);
        
        let newItems: CartItem[];
        if (existing) {
          newItems = items.map((i) =>
            i.variant_id === newItem.variant_id
              ? { ...i, qty: i.qty + newItem.qty, subtotal: i.price * (i.qty + newItem.qty) }
              : i
          );
        } else {
          newItems = [...items, { ...newItem, subtotal: newItem.price * newItem.qty }];
        }
        
        set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
        
        // Sync to server silently
        try {
          await updateCart(newItems.map((i) => ({ variant_id: i.variant_id, qty: i.qty })));
        } catch {
          // Fire and forget - will be synced next time
        } finally {
          set({ loading: false });
        }
      },

      updateQty: async (variantId, qty) => {
        set({ loading: true });
        const { items } = get();
        if (qty <= 0) return get().removeItem(variantId);

        const newItems = items.map((i) =>
          i.variant_id === variantId
            ? { ...i, qty, subtotal: i.price * qty }
            : i
        );
        
        set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
        
        try {
          await updateCart(newItems.map((i) => ({ variant_id: i.variant_id, qty: i.qty })));
        } catch {
        } finally {
          set({ loading: false });
        }
      },

      removeItem: async (variantId) => {
        set({ loading: true });
        const { items } = get();
        const newItems = items.filter((i) => i.variant_id !== variantId);
        
        set({ items: newItems, total: newItems.reduce((acc, i) => acc + i.subtotal, 0) });
        
        try {
          await updateCart(newItems.map((i) => ({ variant_id: i.variant_id, qty: i.qty })));
        } catch {
        } finally {
          set({ loading: false });
        }
      },

      clearCart: async () => {
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
          const cart = await getCart();
          set({ items: cart.items, total: cart.total });
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
    }),
    {
      name: "kriya-cart",
      // Only persist items and total, not loading state
      partialize: (state) => ({ items: state.items, total: state.total }),
    }
  )
);

