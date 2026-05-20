import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { calculateOrderTotal } from "@/lib/pricing";
import { generateOrderPdf, type OrderPdfItem } from "@/lib/orderPdf";

export const runtime = "nodejs";

/** GET /api/admin/orders/[id]/pdf — download a per-order sales sheet + picking list as a PDF. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }
    await connectDB();
    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const o = order as unknown as {
      _id: unknown;
      userId: unknown;
      signedAt?: Date;
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

    const shortCode = String(o._id).slice(-8);
    const pdf = await generateOrderPdf({
      shortCode,
      signedAt: o.signedAt ?? null,
      customer: user ? {
        name: (user as unknown as { name?: string }).name,
        companyName: (user as unknown as { companyName?: string }).companyName,
        email: (user as unknown as { email?: string }).email,
        vatNumber: (user as unknown as { vatNumber?: string }).vatNumber,
      } : null,
      deliverySnapshot: o.deliverySnapshot ?? null,
      items: pdfItems,
      total: calculateOrderTotal(items),
    });

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="order-${shortCode}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("order pdf error:", e);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
