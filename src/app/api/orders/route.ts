import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";
import { Session } from "@/models/Session";
import { z } from "zod";
import mongoose from "mongoose";

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
      size: z.string().optional(),
    })
  ),
});

function mapOrder(o: {
  _id: unknown;
  items: { productId: unknown; sku: string; quantity: number; pricePerItem?: number; packSize?: number; size?: string }[];
  status: string;
  signedAt?: Date;
  createdAt: Date;
}) {
  return {
    id: String(o._id),
    items: (o.items ?? []).map((i) => ({
      productId: String(i.productId),
      sku: i.sku,
      quantity: i.quantity,
      pricePerItem: i.pricePerItem,
      packSize: i.packSize,
      size: i.size,
    })),
    status: o.status,
    signedAt: o.signedAt,
    createdAt: o.createdAt,
  };
}

export async function GET() {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await User.findById(session.userId).select("pricingApproved role");
    const pricingApproved = user?.role === "admin" || (user?.pricingApproved ?? false);

    const all = await Order.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .lean();
    const cart = all.find((o) => o.status === "pending") ?? null;

    // Refresh prices on pending cart from current product data
    if (cart && pricingApproved) {
      const items = (cart.items ?? []) as { productId: unknown; sku: string; quantity: number; pricePerItem?: number; packSize?: number; size?: string }[];
      const productIds = items.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).select("pricePerItem").lean();
      const priceMap = new Map(products.map((p) => [String(p._id), (p as { pricePerItem?: number }).pricePerItem]));
      for (const item of items) {
        const currentPrice = priceMap.get(String(item.productId));
        if (currentPrice !== undefined) {
          item.pricePerItem = currentPrice;
        }
      }
    }

    const orders = all.map((o) => mapOrder(o as unknown as Parameters<typeof mapOrder>[0]));
    return NextResponse.json({
      cart: cart ? mapOrder(cart as unknown as Parameters<typeof mapOrder>[0]) : null,
      orders,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { items } = parsed.data;

    // Resolve products and build new lines (validate pack size)
    const newLines: { productId: string; sku: string; quantity: number; pricePerItem?: number; packSize: number }[] = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }
      if (item.quantity % product.packSize !== 0) {
        return NextResponse.json(
          { error: `Quantity for ${product.sku} must be a multiple of pack size ${product.packSize}` },
          { status: 400 }
        );
      }
      const minPacks = product.minPacks ?? 1;
      const minQty = product.packSize * minPacks;
      if (item.quantity < minQty) {
        return NextResponse.json(
          { error: `Minimum order for ${product.sku} is ${minPacks} pack${minPacks > 1 ? "s" : ""} (${minQty} items)` },
          { status: 400 }
        );
      }
      newLines.push({
        productId: product._id.toString(),
        sku: product.sku,
        quantity: item.quantity,
        pricePerItem: (user.role === "admin" || user.pricingApproved) ? product.pricePerItem : undefined,
        packSize: product.packSize,
      });
    }

    if (newLines.length === 0) {
      return NextResponse.json({ error: "At least one item required" }, { status: 400 });
    }

    // Get or create single pending cart for this user
    let order = await Order.findOne({ userId: session.userId, status: "pending" });
    if (!order) {
      order = await Order.create({
        userId: session.userId,
        items: [],
        status: "pending",
      });
    }

    // Merge: add new lines into existing items (same productId => add quantity)
    const existing = order.items as { productId: mongoose.Types.ObjectId; sku: string; quantity: number; pricePerItem?: number; packSize?: number }[];
    const byKey = new Map<string, { productId: mongoose.Types.ObjectId; sku: string; quantity: number; pricePerItem?: number; packSize: number }>();
    for (const line of existing) {
      const id = line.productId.toString();
      const packSize = line.packSize ?? (await Product.findById(line.productId))?.packSize ?? 1;
      byKey.set(id, { ...line, productId: line.productId, quantity: line.quantity, packSize });
    }
    for (const line of newLines) {
      const current = byKey.get(line.productId);
      if (current) {
        current.quantity += line.quantity;
        current.pricePerItem = line.pricePerItem;
      } else {
        byKey.set(line.productId, {
          productId: new mongoose.Types.ObjectId(line.productId),
          sku: line.sku,
          quantity: line.quantity,
          pricePerItem: line.pricePerItem,
          packSize: line.packSize,
        });
      }
    }

    // Re-validate pack size for merged quantities
    const merged = Array.from(byKey.values());
    for (const line of merged) {
      const product = await Product.findById(line.productId);
      if (!product) continue;
      if (line.quantity % product.packSize !== 0) {
        return NextResponse.json(
          { error: `Total quantity for ${product.sku} must be a multiple of pack size ${product.packSize}` },
          { status: 400 }
        );
      }
    }

    order.items = merged;
    await order.save();

    return NextResponse.json({
      id: order._id.toString(),
      items: order.items,
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}
