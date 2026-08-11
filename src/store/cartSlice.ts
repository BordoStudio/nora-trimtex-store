import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CartItem = { lineId: string; id: string; sku: string; name: string; slug: string; categoryId: string; image: string; variantId?: string; variantLabel?: string; priceUsd?: number; tradePriceHidden?: boolean; quantity: number };
type CartState = { items: CartItem[]; open: boolean };

const initialState: CartState = { items: [], open: false };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addSample(state, action: PayloadAction<Omit<CartItem, "quantity">>) {
      const existing = state.items.find((item) => item.lineId === action.payload.lineId);
      if (existing) {
        existing.quantity += 1;
        existing.image = action.payload.image;
        existing.name = action.payload.name;
        existing.slug = action.payload.slug;
        existing.categoryId = action.payload.categoryId;
        existing.variantId = action.payload.variantId;
        existing.variantLabel = action.payload.variantLabel;
        if (!action.payload.tradePriceHidden && action.payload.priceUsd !== undefined) {
          existing.priceUsd = action.payload.priceUsd;
          existing.tradePriceHidden = false;
        }
      }
      else state.items.push({ ...action.payload, quantity: 1 });
    },
    removeSample(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.lineId !== action.payload);
    },
    incrementItem(state, action: PayloadAction<string>) {
      const item = state.items.find((entry) => entry.lineId === action.payload);
      if (item) item.quantity += 1;
    },
    decrementItem(state, action: PayloadAction<string>) {
      const item = state.items.find((entry) => entry.lineId === action.payload);
      if (!item) return;
      if (item.quantity > 1) item.quantity -= 1;
      else state.items = state.items.filter((entry) => entry.lineId !== action.payload);
    },
    clearCart(state) { state.items = []; },
    hydrateCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload.filter((item) => item?.id && item?.sku).map((item) => ({
        ...item,
        image: typeof item.image === "string" && item.image.trim() ? item.image : "/brand/product-placeholder.svg",
        lineId: item.lineId || `${item.id}:${item.variantId || "default"}`,
      }));
    },
    setCartOpen(state, action: PayloadAction<boolean>) { state.open = action.payload; }
  }
});

export const { addSample, removeSample, incrementItem, decrementItem, clearCart, hydrateCart, setCartOpen } = cartSlice.actions;
export default cartSlice.reducer;
