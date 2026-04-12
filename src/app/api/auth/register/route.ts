import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { z } from "zod";

function getResend() {
  return new Resend(process.env.EMAIL_API_KEY);
}

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const bodySchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().optional(),
  companyName: z.string().optional(),
  applicationMessage: z.string().max(5000).optional(),
});

async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${token}`;

  if (process.env.NODE_ENV === "development") {
    console.log("[Verification link for", email, "]:", verifyLink);
    return;
  }

  const emailFrom = process.env.EMAIL_FROM;
  if (!emailFrom || !process.env.EMAIL_API_KEY) {
    console.error("EMAIL_FROM or EMAIL_API_KEY not set — skipping verification email");
    return;
  }

  try {
    await getResend().emails.send({
      from: emailFrom,
      to: email,
      subject: "Verify your Claudia.C B2B account",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Claudia.C B2B</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <div style="margin: 30px 0;">
            <a href="${verifyLink}" style="background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; display: inline-block; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy this link: <code>${verifyLink}</code></p>
          <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
          <p style="color: #999; font-size: 12px;">If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`register:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password, name, companyName, applicationMessage } = parsed.data;
    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      // Don't reveal whether email exists
      return NextResponse.json({
        message: "Please check your email to verify your account.",
      });
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = nanoid(48);

    const user = await User.create({
      email,
      passwordHash,
      name,
      companyName,
      applicationMessage: applicationMessage || undefined,
      pricingApproved: false,
      emailVerified: false,
      verificationToken,
    });

    await sendVerificationEmail(email, verificationToken);

    await audit({
      action: "register",
      userId: user._id.toString(),
      userEmail: email,
      ip,
    });

    return NextResponse.json({
      message: "Please check your email to verify your account.",
    });
  } catch (e) {
    console.error("Registration error:", e);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
