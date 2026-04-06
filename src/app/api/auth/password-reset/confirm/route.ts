import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
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
  token: z.string(),
  newPassword: passwordSchema,
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`pw-confirm:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { token, newPassword } = parsed.data;
    await connectDB();
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }
    const passwordHash = await hashPassword(newPassword);
    await User.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash },
        $unset: { resetToken: 1, resetTokenExpires: 1 },
      }
    );

    // Invalidate ALL existing sessions for this user
    await Session.deleteMany({ userId: user._id });

    await audit({
      action: "password_reset_completed",
      userId: user._id.toString(),
      userEmail: user.email,
      ip,
    });

    return NextResponse.json({ ok: true, message: "Password updated. Please log in again." });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
