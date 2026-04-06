import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSessionUser } from "@/lib/requireAdmin";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { z } from "zod";

const bodySchema = z.object({ secret: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`claim-admin:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
    }
    const expected = process.env.CLAIM_ADMIN_SECRET;
    if (!expected) {
      return NextResponse.json(
        { error: "Claim admin is not configured. Set CLAIM_ADMIN_SECRET or promote the user in MongoDB." },
        { status: 503 }
      );
    }
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "You must be logged in to claim admin." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input. Send { \"secret\": \"your-secret\" }." }, { status: 400 });
    }
    // Timing-safe comparison to prevent timing attacks
    const secretMatch =
      parsed.data.secret.length === expected.length &&
      timingSafeEqual(Buffer.from(parsed.data.secret), Buffer.from(expected));
    if (!secretMatch) {
      return NextResponse.json({ error: "Invalid secret." }, { status: 403 });
    }
    await connectDB();
    await User.updateOne({ _id: user.id }, { $set: { role: "admin" } });
    await audit({ action: "role_changed", userId: user.id, userEmail: user.email, ip, details: { newRole: "admin", via: "claim" } });
    return NextResponse.json({ ok: true, message: "You are now an admin." });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Claim failed." }, { status: 500 });
  }
}
