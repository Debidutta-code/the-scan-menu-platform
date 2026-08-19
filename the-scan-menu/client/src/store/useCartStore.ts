import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartAddOn {
  name: string;
  priceDelta: number; // in cents/paise
}

export interface CartItem {
  itemId: string;
  name: string; // snapshot
  variantName?: string; // e.g. "Half", "Full", "Small", "Large"
  price: number; // snapshot of base + selected add-on deltas (per-unit in cents/paise)
  basePrice: number; // base price of the item or selected variant
  quantity: number;
  specialInstructions?: string;
  selectedAddOns: CartAddOn[];
}

export interface CartState {
  items: CartItem[];
  tableToken: string | null;
  restaurantSlug: string | null;
  customerNote: string;
  idempotencyKey: string | null;
  setTable: (restaurantSlug: string, tableToken: string) => void;
  setCustomerNote: (note: string) => void;
  getOrCreateIdempotencyKey: () => string;
  resetIdempotencyKey: () => string;
  addItem: (item: Omit<CartItem, 'price'> & { basePrice: number }) => void;
  updateQuantity: (itemId: string, selectedAddOns: CartAddOn[], specialInstructions: string, delta: number, variantName?: string) => void;
  removeItem: (itemId: string, selectedAddOns: CartAddOn[], specialInstructions: string, variantName?: string) => void;
  clearCart: () => void;
}

export const isSameItem = (
  aId: string,
  aAddOns: CartAddOn[],
  aInstructions: string | undefined,
  aVariant: string | undefined,
  bId: string,
  bAddOns: CartAddOn[],
  bInstructions: string | undefined,
  bVariant: string | undefined
): boolean => {
  if (aId !== bId) return false;
  if ((aVariant || '') !== (bVariant || '')) return false;
  if ((aInstructions || '').trim() !== (bInstructions || '').trim()) return false;
  if (aAddOns.length !== bAddOns.length) return false;

  const sortedA = [...aAddOns].sort((x, y) => x.name.localeCompare(y.name));
  const sortedB = [...bAddOns].sort((x, y) => x.name.localeCompare(y.name));

  return sortedA.every(
    (val, index) => val.name === sortedB[index].name && val.priceDelta === sortedB[index].priceDelta
  );
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const safeSessionStorage = {
  getItem: (name: string) => {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(name);
    }
    return null;
  },
  setItem: (name: string, value: string) => {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(name, value);
    }
  },
  removeItem: (name: string) => {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(name);
    }
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableToken: null,
      restaurantSlug: null,
      customerNote: '',
      idempotencyKey: null,

      setTable: (restaurantSlug, tableToken) => {
        const currentToken = get().tableToken;
        if (currentToken !== tableToken) {
          // Clears cart on table token mismatch/change
          set({ items: [], restaurantSlug, tableToken, customerNote: '', idempotencyKey: null });
        } else {
          set({ restaurantSlug, tableToken });
        }
      },

      setCustomerNote: (customerNote) => {
        set({ customerNote });
      },

      getOrCreateIdempotencyKey: () => {
        const existing = get().idempotencyKey;
        if (existing) return existing;
        const newKey = `idem_${generateUUID()}`;
        set({ idempotencyKey: newKey });
        return newKey;
      },

      resetIdempotencyKey: () => {
        const newKey = `idem_${generateUUID()}`;
        set({ idempotencyKey: newKey });
        return newKey;
      },

      addItem: (newItem) => {
        const calculatedPrice = newItem.basePrice + newItem.selectedAddOns.reduce((sum, addOn) => sum + addOn.priceDelta, 0);
        const snapshotItem: CartItem = {
          ...newItem,
          price: calculatedPrice,
        };

        const existingItems = get().items;
        const matchingIndex = existingItems.findIndex((item) =>
          isSameItem(
            item.itemId,
            item.selectedAddOns,
            item.specialInstructions,
            item.variantName,
            snapshotItem.itemId,
            snapshotItem.selectedAddOns,
            snapshotItem.specialInstructions,
            snapshotItem.variantName
          )
        );

        if (matchingIndex > -1) {
          const updatedItems = [...existingItems];
          updatedItems[matchingIndex].quantity += snapshotItem.quantity;
          set({ items: updatedItems });
        } else {
          set({ items: [...existingItems, snapshotItem] });
        }
      },

      updateQuantity: (itemId, selectedAddOns, specialInstructions, delta, variantName) => {
        const existingItems = get().items;
        const matchingIndex = existingItems.findIndex((item) =>
          isSameItem(
            item.itemId,
            item.selectedAddOns,
            item.specialInstructions,
            item.variantName,
            itemId,
            selectedAddOns,
            specialInstructions,
            variantName
          )
        );

        if (matchingIndex > -1) {
          const updatedItems = [...existingItems];
          const newQty = updatedItems[matchingIndex].quantity + delta;
          if (newQty <= 0) {
            updatedItems.splice(matchingIndex, 1);
          } else {
            updatedItems[matchingIndex].quantity = newQty;
          }
          set({ items: updatedItems });
        }
      },

      removeItem: (itemId, selectedAddOns, specialInstructions, variantName) => {
        const existingItems = get().items;
        const updatedItems = existingItems.filter(
          (item) =>
            !isSameItem(
              item.itemId,
              item.selectedAddOns,
              item.specialInstructions,
              item.variantName,
              itemId,
              selectedAddOns,
              specialInstructions,
              variantName
            )
        );
        set({ items: updatedItems });
      },

      clearCart: () => {
        set({ items: [], customerNote: '', idempotencyKey: null });
      },
    }),
    {
      name: 'pixora-cart-storage',
      storage: createJSONStorage(() => safeSessionStorage), // persist only to session storage safely
    }
  )
);
