/** Stock category: when the product is available */
export type StockCategory = "previous" | "current" | "forward";

/** Product category (e.g. Tops, Trousers) */
export const PRODUCT_CATEGORIES = [
  "Tops",
  "T-shirts",
  "Trousers",
  "Cardigans",
  "Jumpers",
  "Dresses",
  "Skirts",
  "Jackets",
  "Other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductDoc {
  _id: string;
  sku: string;
  barcode?: string;
  styleNumber?: string;
  name: string;
  description?: string;
  category: ProductCategory;
  stockCategory: StockCategory;
  colour: string;
  attributes: Record<string, string>;
  images: string[];
  packSize: number; // min order qty (e.g. 6 per pack)
  pricePerItem?: number; // only shown if user has pricing access
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDoc {
  _id: string;
  email: string;
  passwordHash: string;
  name?: string;
  companyName?: string;
  pricingApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDoc {
  _id: string;
  userId: string;
  items: { productId: string; sku: string; quantity: number; pricePerItem?: number }[];
  status: "pending" | "signed" | "confirmed" | "cancelled";
  signatureDataUrl?: string;
  signedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
