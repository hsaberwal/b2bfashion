import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { calculateOrderTotal } from "@/lib/pricing";
import { decrypt } from "@/lib/encrypt";
import { generateOrderPdf, type OrderPdfItem } from "@/lib/orderPdf";

export type BuiltOrderPdf = {
  buffer: Buffer;
  shortCode: string;
  filename: string;
  customerEmail?: string;
  customerName?: string;
};

/**
 * Load an order and its related product/customer data, then render the
 * per-order sales sheet + picking list PDF. Shared by the admin PDF download
 * route and the automated order emails so both produce an identical document
 * (including the customer's signature drawn on the signature line).
 *
 * Returns null if the order does not exist.
 */
export async function buildOrderPdf(orderId: string): Promise<BuiltOrderPdf | null> {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return null;
  await connectDB();
  const order = await Order.findById(orderId).lean();
  if (!order) return null;

  const o = order as unknown as {
    _id: unknown;
    userId: unknown;
    signedAt?: Date;
    signatureDataUrl?: string;
    items?: { productId: mongoose.Types.ObjectId; sku: string; quantity: number; pricePerPiece?: number; pricePerPack?: number; packSize?: number; size?: string }[];
    deliverySnapshot?: Record<string, string>;
  };

  const items = o.items ?? [];

  const [user, products] = await Promise.all([
    User.findById(o.userId).select("email name companyName vatNumber").lean(),
    Product.find({ _id: { $in: items.map((i) => i.productId) } })
      .select("sku name colour sizes sizeRatio packSize")
      .lean(),
  ]);

  const productById = new Map<string, { sku: string; name: string; colour?: string; sizes?: string[]; sizeRatio?: number[]; packSize?: number }>();
  for (const p of products) {
    productById.set(String((p as unknown as { _id: unknown })._id), p as unknown as {
      sku: string; name: string; colour?: string; sizes?: string[]; sizeRatio?: number[]; packSize?: number;
    });
  }

  const pdfItems: OrderPdfItem[] = items.map((i) => {
    const p = productById.get(String(i.productId));
    return {
      sku: i.sku,
      productName: p?.name ?? i.sku,
      colour: p?.colour,
      quantity: i.quantity,
      packSize: i.packSize ?? p?.packSize ?? 1,
      sizes: p?.sizes,
      sizeRatio: p?.sizeRatio,
      // Legacy docs may still hold `pricePerPack`; treat it as per-piece (the historical value).
      pricePerPiece: i.pricePerPiece ?? i.pricePerPack,
    };
  });

  const u = user as unknown as { name?: string; companyName?: string; email?: string; vatNumber?: string } | null;
  const shortCode = String(o._id).slice(-8);

  // The signature is stored encrypted at rest; decrypt it so PDFKit can draw it.
  const signatureImage = o.signatureDataUrl ? decrypt(o.signatureDataUrl) : null;

  const buffer = await generateOrderPdf({
    shortCode,
    signedAt: o.signedAt ?? null,
    customer: u ? {
      name: u.name,
      companyName: u.companyName,
      email: u.email,
      vatNumber: u.vatNumber,
    } : null,
    deliverySnapshot: o.deliverySnapshot ?? null,
    items: pdfItems,
    total: calculateOrderTotal(items),
    signatureImage,
  });

  return {
    buffer,
    shortCode,
    filename: `order-${shortCode}.pdf`,
    customerEmail: u?.email,
    customerName: u?.name,
  };
}
