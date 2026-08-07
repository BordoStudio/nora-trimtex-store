export const locales = ["en", "de", "uk", "ru"] as const;
export type Locale = (typeof locales)[number];
export type LocalizedText = Record<Locale, string>;

export type ProductVariant = {
  id: string;
  sku?: string;
  optionValues: Record<string, string>;
  mediaKeys: string[];
  stock: { tracked: boolean; available: number };
  price?: { amount: number; currency: "EUR" | "USD" };
};

export type ProductDocument = {
  id: string;
  sku: string;
  slug: string;
  categoryId: string;
  status: "draft" | "active" | "archived";
  names: LocalizedText;
  descriptions?: Partial<LocalizedText>;
  primaryImageKey: string;
  media: Array<{ key: string; alt: Partial<LocalizedText>; sortOrder: number }>;
  variants: ProductVariant[];
  variantCount: number;
  tags: string[];
  featured: boolean;
  isNew: boolean;
  attributes: Record<string, string | number | boolean>;
  priceUsd?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDocument = {
  id?: string;
  orderNumber: string;
  locale: Locale;
  customer: { name: string; email: string; phone: string; company?: string; country: string; city: string; address: string; postcode: string; notes?: string };
  items: Array<{ productId: string; sku: string; name?: string; slug?: string; categoryId?: string; variantId?: string; variantLabel?: string; unitPriceUsd?: number; quantity: number }>;
  pricedSubtotalUsd: number;
  status: "received" | "quoted" | "confirmed" | "paid" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryDocument = {
  id: string;
  slug: string;
  names: LocalizedText;
  sortOrder: number;
  active: boolean;
};

export type SampleRequestDocument = {
  id?: string;
  requestNumber: string;
  locale: Locale;
  customer: { name: string; email: string; company?: string; phone?: string };
  items: Array<{ productId: string; sku: string; variantId?: string; quantity: number }>;
  notes?: string;
  status: "new" | "contacted" | "quoted" | "closed";
  createdAt: Date;
  updatedAt: Date;
};
