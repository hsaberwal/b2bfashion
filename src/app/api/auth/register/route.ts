import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { z } from "zod";

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
      // Don't reveal whether the email exists — return same response shape
      return NextResponse.json({
        id: "pending",
        email,
        message: "Account created. Please log in.",
      });
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      name,
      companyName,
      applicationMessage: applicationMessage || undefined,
      pricingApproved: false,
    });

    await audit({
      action: "register",
      userId: user._id.toString(),
      userEmail: email,
      ip,
    });

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      message: "Account created. Please log in.",
    });
  } catch (e) {
    console.error("Registration error:", e);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
