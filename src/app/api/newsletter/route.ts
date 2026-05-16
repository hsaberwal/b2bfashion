import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { NewsletterSubscriber } from "@/models/NewsletterSubscriber";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.string().email().max(254),
  source: z.string().max(40).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (isRateLimited(`newsletter:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  let parsed;
  try {
    const body = await request.json();
    parsed = bodySchema.safeParse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const source = parsed.data.source?.trim() || "footer";

  try {
    await connectDB();
    await NewsletterSubscriber.updateOne(
      { email },
      { $setOnInsert: { email, source, ipAddress: ip }, $set: { unsubscribed: false } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Newsletter signup failed:", e);
    return NextResponse.json({ error: "Could not save your email. Please try again later." }, { status: 500 });
  }
}
