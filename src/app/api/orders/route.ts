import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";
import { Session } from "@/models/Session";
import { z } from "zod";

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
    })
  ),
});

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
    const orders = await Order.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({
      orders: orders.map((o) => ({
        id: String(o._id),
        items: o.items,
        status: o.status,
        signedAt: o.signedAt,
        createdAt: o.createdAt,
      })),
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

    // Bulk only: each item quantity must be a multiple of pack size
    const orderItems: { productId: string; sku: string; quantity: number; pricePerItem?: number }[] = [];
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
      orderItems.push({
        productId: product._id.toString(),
        sku: product.sku,
        quantity: item.quantity,
        pricePerItem: user.pricingApproved ? product.pricePerItem : undefined,
      });
    }

    if (orderItems.length === 0) {
      return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 });
    }

    const order = await Order.create({
      userId: session.userId,
      items: orderItems,
      status: "pending",
    });
    return NextResponse.json({
      id: order._id.toString(),
      items: order.items,
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
