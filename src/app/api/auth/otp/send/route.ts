import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { z } from "zod";

// In production, use Resend/SendGrid etc. For local dev we just store OTP and log it.
function sendOtpEmail(_email: string, code: string): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log("[OTP for", _email, "]:", code);
    return Promise.resolve();
  }
  // TODO: integrate EMAIL_API_KEY and send real email
  return Promise.resolve();
}

const bodySchema = z.object({ email: z.string().email() });

const OTP_EXPIRY_MINUTES = 10;

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
      return NextResponse.json({ error: "No account with this email" }, { status: 404 });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + OTP_EXPIRY_MINUTES);
    await User.updateOne(
      { _id: user._id },
      { $set: { otpCode: code, otpExpires } }
    );
    await sendOtpEmail(email, code);
    return NextResponse.json({ ok: true, message: "OTP sent to your email" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
