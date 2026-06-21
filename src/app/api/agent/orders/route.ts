import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAgent } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { assertOwnsCustomer } from "@/lib/agentOwnership";
import { buildOrderLines } from "@/lib/orderService";
import { calculateOrderTotal } from "@/lib/pricing";

type Line = { productId: mongoose.Types.ObjectId; sku: string; quantity: number; pricePerPiece?: number; packSize?: number };

/** Build the basket response for a pending order: line details + product names/images + total. */
async function serializeBasket(order: { _id: unknown; items?: Line[] } | null) {
  if (!order) return { orderId: null, items: [], total: 0 };
  const items = (order.items ?? []).filter((i) => i.quantity > 0);
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } })
    .select("name colour images").lean();
  const byId = new Map(products.map((p) => [String((p as unknown as { _id: unknown })._id), p]));
  return {
    orderId: String(order._id),
    items: items.map((i) => {
      const p = byId.get(String(i.productId)) as { name?: string; colour?: string; images?: string[] } | undefined;
      return {
        productId: String(i.productId),
        sku: i.sku,
        name: p?.name ?? i.sku,
        colour: p?.colour,
        image: p?.images?.[0],
        packSize: i.packSize ?? 1,
        packs: i.packSize ? Math.floor(i.quantity / i.packSize) : i.quantity,
        quantity: i.quantity,
        pricePerPiece: i.pricePerPiece,
        lineTotal: (i.pricePerPiece ?? 0) * i.quantity,
      };
    }),
    total: calculateOrderTotal(items),
  };
}

async function getPendingOrder(customerId: string) {
  return Order.findOne({ userId: customerId, status: "pending" });
}

/** GET /api/agent/orders?customerId= — the customer's current basket (pending order). */
export async function GET(request: NextRequest) {
  try {
    const agent = await requireAgent();
    const customerId = request.nextUrl.searchParams.get("customerId") ?? "";
    if (!mongoose.Types.ObjectId.isValid(customerId)) return NextResponse.json({ error: "Invalid customer" }, { status: 400 });
    await assertOwnsCustomer(agent, customerId);
    await connectDB();
    const order = await getPendingOrder(customerId);
    return NextResponse.json(await serializeBasket(order));
  } catch (e) {
    return handleErr(e, "Failed to load basket");
  }
}

const addSchema = z.object({
  customerId: z.string(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
});

/** POST /api/agent/orders — add items to the customer's pending order (stamps agentId). */
export async function POST(request: NextRequest) {
  try {
    const agent = await requireAgent();
    const parsed = addSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    await assertOwnsCustomer(agent, parsed.data.customerId);
    await connectDB();

    const lines = await buildOrderLines(parsed.data.items, { canPrice: true });

    let order = await getPendingOrder(parsed.data.customerId);
    if (!order) {
      order = await Order.create({ userId: parsed.data.customerId, agentId: agent.id, items: [], status: "pending" });
    } else if (!order.agentId) {
      order.agentId = new mongoose.Types.ObjectId(agent.id);
    } else if (String(order.agentId) !== agent.id && agent.role !== "admin") {
      return NextResponse.json({ error: "This customer already has an open basket with another agent." }, { status: 409 });
    }

    const existing = order.items as Line[];
    const byKey = new Map<string, Line>();
    for (const l of existing) byKey.set(String(l.productId), l);
    for (const l of lines) {
      const cur = byKey.get(String(l.productId));
      if (cur) {
        cur.quantity += l.quantity;
        cur.pricePerPiece = l.pricePerPiece;
        cur.packSize = l.packSize;
      } else {
        byKey.set(String(l.productId), l);
      }
    }
    order.items = Array.from(byKey.values());
    await order.save();
    return NextResponse.json(await serializeBasket(order));
  } catch (e) {
    return handleErr(e, "Failed to update basket");
  }
}

const patchSchema = z.object({
  customerId: z.string(),
  productId: z.string(),
  packs: z.number().int().min(0), // 0 removes the line
});

/** PATCH /api/agent/orders — set a line's pack count (0 removes it). */
export async function PATCH(request: NextRequest) {
  try {
    const agent = await requireAgent();
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    await assertOwnsCustomer(agent, parsed.data.customerId);
    await connectDB();
    const order = await getPendingOrder(parsed.data.customerId);
    if (!order) return NextResponse.json({ error: "No open basket" }, { status: 404 });
    const items = order.items as Line[];
    const line = items.find((i) => String(i.productId) === parsed.data.productId);
    if (!line) return NextResponse.json({ error: "Item not in basket" }, { status: 404 });
    const packSize = line.packSize ?? 1;
    if (parsed.data.packs === 0) {
      order.items = items.filter((i) => String(i.productId) !== parsed.data.productId);
    } else {
      line.quantity = parsed.data.packs * packSize;
    }
    await order.save();
    return NextResponse.json(await serializeBasket(order));
  } catch (e) {
    return handleErr(e, "Failed to update basket");
  }
}

function handleErr(e: unknown, fallback: string) {
  const err = e as Error & { status?: number };
  if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (err.status === 403) return NextResponse.json({ error: err.message || "Forbidden" }, { status: 403 });
  if (err.status === 404) return NextResponse.json({ error: err.message || "Not found" }, { status: 404 });
  if (err.status === 400) return NextResponse.json({ error: err.message || "Invalid input" }, { status: 400 });
  if (err.status === 409) return NextResponse.json({ error: err.message }, { status: 409 });
  console.error("agent orders error:", e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
