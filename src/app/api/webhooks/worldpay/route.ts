import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { verifyWorldpayMac } from "@/lib/worldpay";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

/**
 * POST /api/webhooks/worldpay
 *
 * Server-to-server webhook from Worldpay for authoritative payment status updates.
 * This is more reliable than the redirect-based status update because it comes
 * directly from Worldpay's servers, not through the user's browser.
 *
 * Worldpay sends XML notifications, but we also support JSON for flexibility.
 * Configure this URL in your Worldpay merchant admin as the notification URL.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const contentType = request.headers.get("content-type") ?? "";

    let orderCode: string | undefined;
    let paymentStatus: string | undefined;
    let paymentAmount: string | undefined;
    let paymentCurrency: string | undefined;
    let mac: string | undefined;

    if (contentType.includes("xml") || contentType.includes("text")) {
      // Parse Worldpay XML notification
      const xml = await request.text();

      const orderCodeMatch = xml.match(/orderCode="([^"]+)"/);
      orderCode = orderCodeMatch?.[1];

      // Worldpay uses lastEvent for payment status
      const statusMatch = xml.match(/<lastEvent>([^<]+)<\/lastEvent>/);
      paymentStatus = statusMatch?.[1];

      const amountMatch = xml.match(/<amount[^>]*value="(\d+)"[^>]*currencyCode="([^"]+)"/);
      paymentAmount = amountMatch?.[1];
      paymentCurrency = amountMatch?.[2];

      const macMatch = xml.match(/<mac>([^<]+)<\/mac>/);
      mac = macMatch?.[1];
    } else {
      // JSON fallback
      const body = await request.json();
      orderCode = body.orderCode;
      paymentStatus = body.paymentStatus ?? body.lastEvent;
      paymentAmount = String(body.paymentAmount ?? "");
      paymentCurrency = body.paymentCurrency ?? "GBP";
      mac = body.mac;
    }

    if (!orderCode || !paymentStatus) {
      return NextResponse.json({ error: "Missing orderCode or paymentStatus" }, { status: 400 });
    }

    // Verify MAC if configured
    const macValid = await verifyWorldpayMac(
      orderCode,
      paymentAmount ?? "",
      paymentCurrency ?? "GBP",
      paymentStatus,
      mac ?? ""
    );
    if (!macValid) {
      console.error("Worldpay webhook MAC verification failed:", orderCode);
      return NextResponse.json({ error: "MAC verification failed" }, { status: 403 });
    }

    await connectDB();
    const order = await Order.findOne({ worldpayOrderCode: orderCode });
    if (!order) {
      console.error("Worldpay webhook: order not found for code:", orderCode);
      // Return 200 to prevent Worldpay from retrying
      return NextResponse.json({ ok: true, message: "Order not found" });
    }

    // Map Worldpay status to our status
    const normalizedStatus = paymentStatus.toUpperCase();
    if (normalizedStatus === "AUTHORISED" || normalizedStatus === "CAPTURED") {
      order.paymentStatus = "paid";
      order.status = "confirmed";
      if (order.paymentOption === "pay_deposit") {
        order.depositPaid = true;
      }
    } else if (normalizedStatus === "REFUSED" || normalizedStatus === "ERROR") {
      order.paymentStatus = "failed";
    } else if (normalizedStatus === "REFUNDED" || normalizedStatus === "PARTIALLY_REFUNDED") {
      order.paymentStatus = "refunded";
    }
    // SENT_FOR_AUTHORISATION, SHOPPER_REDIRECTED etc. — leave as pending

    await order.save();

    // Stock adjustment based on new status
    const items = (order.items ?? []) as { productId: unknown; quantity: number; packSize?: number }[];
    if (normalizedStatus === "AUTHORISED" || normalizedStatus === "CAPTURED") {
      // Consume reserved stock (decrement both)
      for (const item of items) {
        const packs = Math.floor(item.quantity / (item.packSize ?? 1));
        if (packs > 0) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { packsInStock: -packs, packsReserved: -packs } }
          ).catch(() => {});
        }
      }
    } else if (normalizedStatus === "REFUSED" || normalizedStatus === "ERROR") {
      // Release reservation
      for (const item of items) {
        const packs = Math.floor(item.quantity / (item.packSize ?? 1));
        if (packs > 0) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { packsReserved: -packs } }
          ).catch(() => {});
        }
      }
    }

    await audit({
      action: normalizedStatus === "AUTHORISED" || normalizedStatus === "CAPTURED" ? "payment_completed" : "payment_failed",
      targetType: "order",
      targetId: order._id.toString(),
      ip,
      details: { orderCode, worldpayStatus: paymentStatus, via: "webhook" },
    });

    // Worldpay expects [OK] in the response
    return new NextResponse("[OK]", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (e) {
    console.error("Worldpay webhook error:", e);
    // Return 200 to prevent infinite retries
    return new NextResponse("[OK]", { status: 200 });
  }
}
