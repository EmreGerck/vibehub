import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalAmount: () => number;
  itemsByTenant: () => Record<string, CartItem[]>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === newItem.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === newItem.variantId
                  ? { ...i, qty: i.qty + newItem.qty }
                  : i,
              ),
            };
          }
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (variantId) => {
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) }));
      },

      updateQty: (variantId, qty) => {
        if (qty <= 0) {
          get().removeItem(variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.variantId === variantId ? { ...i, qty } : i)),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),

      totalAmount: () =>
        get().items.reduce((sum, i) => {
          const price = i.variant.priceOverride ?? i.variant.price;
          return sum + price * i.qty;
        }, 0),

      itemsByTenant: () => {
        const groups: Record<string, CartItem[]> = {};
        for (const item of get().items) {
          if (!groups[item.tenantId]) groups[item.tenantId] = [];
          groups[item.tenantId].push(item);
        }
        return groups;
      },
    }),
    {
      name: 'cart',
    },
  ),
);
