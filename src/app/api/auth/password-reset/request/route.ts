import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { nanoid } from "nanoid";
import { z } from "zod";

// In production, send email with link containing token. For local dev we log the link.
const RESET_EXPIRY_HOURS = 1;

const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const { email } = parsed.data;
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ ok: true, message: "If an account exists, you will receive an email." });
    }
    const resetToken = nanoid(32);
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + RESET_EXPIRY_HOURS);
    await User.updateOne(
      { _id: user._id },
      { $set: { resetToken, resetTokenExpires } }
    );
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    if (process.env.NODE_ENV === "development") {
      console.log("[Password reset link for", email, "]:", resetLink);
    }
    // TODO: send email with resetLink
    return NextResponse.json({ ok: true, message: "If an account exists, you will receive an email." });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
