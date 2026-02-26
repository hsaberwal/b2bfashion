import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";
import { Session } from "@/models/Session";
import mongoose from "mongoose";
import { z } from "zod";

const updateItemsSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(0),
    })
  ),
});

/** PATCH /api/orders/[id] — update cart items (pending order only). Remove item by omitting it or setting quantity 0. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
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

    const order = await Order.findOne({ _id: id, userId: session.userId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "pending") {
      return NextResponse.json({ error: "Only pending cart can be updated" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateItemsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data.items.filter((i) => i.quantity > 0);
    const serializeItems = (items: { productId: unknown; sku: string; quantity: number; pricePerItem?: number; packSize?: number }[]) =>
      items.map((i) => ({
        productId: String(i.productId),
        sku: i.sku,
        quantity: i.quantity,
        pricePerItem: i.pricePerItem,
        packSize: i.packSize,
      }));

    if (input.length === 0) {
      order.items = [];
      await order.save();
      return NextResponse.json({
        id: order._id.toString(),
        items: serializeItems(order.items),
        status: order.status,
        createdAt: order.createdAt,
      });
    }

    const orderItems: { productId: mongoose.Types.ObjectId; sku: string; quantity: number; pricePerItem?: number; packSize: number }[] = [];
    for (const item of input) {
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
        productId: product._id,
        sku: product.sku,
        quantity: item.quantity,
        pricePerItem: user.pricingApproved ? product.pricePerItem : undefined,
        packSize: product.packSize,
      });
    }

    order.items = orderItems;
    await order.save();

    return NextResponse.json({
      id: order._id.toString(),
      items: orderItems.map((i) => ({
        productId: i.productId.toString(),
        sku: i.sku,
        quantity: i.quantity,
        pricePerItem: i.pricePerItem,
        packSize: i.packSize,
      })),
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}
