import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { z } from "zod";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.EMAIL_API_KEY);
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log("[OTP for", email, "]:", code);
    return;
  }

  const emailFrom = process.env.EMAIL_FROM;
  if (!emailFrom) {
    console.error("EMAIL_FROM not set");
    return;
  }

  if (!process.env.EMAIL_API_KEY) {
    console.error("EMAIL_API_KEY not set");
    return;
  }

  try {
    await getResend().emails.send({
      from: emailFrom,
      to: email,
      subject: "Your password reset code",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Your one-time password is:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <code style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</code>
          </div>
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request a password reset, ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error);
  }
}

const bodySchema = z.object({ email: z.string().email() });

const OTP_EXPIRY_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`otp-send:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many OTP requests. Please try again in 15 minutes." }, { status: 429 });
    }
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const { email } = parsed.data;
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether account exists — same response as success
      return NextResponse.json({ ok: true, message: "If an account exists, an OTP has been sent." });
    }
    const code = String(randomInt(100000, 999999));
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
