import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const SESSION_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`otp-verify:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many verification attempts. Please try again in 15 minutes." }, { status: 429 });
    }
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, code } = parsed.data;
    await connectDB();
    const user = await User.findOne({ email });
    const otpMatch = user?.otpCode
      ? timingSafeEqual(Buffer.from(user.otpCode), Buffer.from(code))
      : false;
    if (!user || !otpMatch) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }
    if (!user.otpExpires || user.otpExpires < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 401 });
    }
    await User.updateOne(
      { _id: user._id },
      { $unset: { otpCode: 1, otpExpires: 1 } }
    );
    const token = createSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
    await Session.create({ token, userId: user._id, expiresAt });
    await setSessionCookie(token);
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role ?? "customer",
        pricingApproved: user.pricingApproved,
        canViewForwardStock: user.role === "admin" ? true : (user.canViewForwardStock ?? false),
        canViewCurrentStock: user.role === "admin" ? true : (user.canViewCurrentStock ?? true),
        canViewPreviousStock: user.role === "admin" ? true : (user.canViewPreviousStock ?? true),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
