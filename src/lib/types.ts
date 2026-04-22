/** Stock category: when the product is available */
export type StockCategory = "previous" | "current" | "forward";

/** Product category — aligned with the Claudia.C stock sheet */
export const PRODUCT_CATEGORIES = [
  "Blouse",
  "Cardigan",
  "Dress",
  "Gilet",
  "Jumper",
  "Shrug",
  "Skirt",
  "T-shirt",
  "Top",
  "Trouser",
  "Tunic",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductDoc {
  _id: string;
  sku: string;
  brandCode?: string;
  brand?: string;
  season?: string;
  name: string;
  description?: string;
  category: ProductCategory;
  stockCategory: StockCategory;
  colour: string;
  attributes: Record<string, string>;
  images: string[];
  packSize: number;
  minPacks?: number;
  pricePerPiece?: number;
  packsInStock?: number;
  packsReserved?: number;
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
  items: { productId: string; sku: string; quantity: number; pricePerPiece?: number }[];
  status: "pending" | "signed" | "confirmed" | "cancelled";
  signatureDataUrl?: string;
  signedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
