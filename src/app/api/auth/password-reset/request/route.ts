import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { nanoid } from "nanoid";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { z } from "zod";
import { Resend } from "resend";

// In production, send email with link containing token. For local dev we log the link.
const RESET_EXPIRY_HOURS = 1;

function getResend() {
  return new Resend(process.env.EMAIL_API_KEY);
}

async function sendResetEmail(email: string, resetLink: string): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log("[Password reset link for", email, "]:", resetLink);
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
      subject: "Reset your password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the link below to proceed:</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy this link: <code>${resetLink}</code></p>
          <p>This link expires in ${RESET_EXPIRY_HOURS} hour(s).</p>
          <p>If you didn't request a password reset, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send reset email:", error);
  }
}

const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`pw-reset:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many reset requests. Please try again in an hour." }, { status: 429 });
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
    await sendResetEmail(email, resetLink);
    return NextResponse.json({ ok: true, message: "If an account exists, you will receive an email." });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
