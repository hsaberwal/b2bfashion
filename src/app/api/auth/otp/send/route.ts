import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
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
