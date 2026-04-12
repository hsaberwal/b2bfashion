import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const SESSION_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many login attempts. Please try again in 15 minutes." }, { status: 429 });
    }
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }
    const { email, password } = parsed.data;
    await connectDB();
    const user = await User.findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      await audit({ action: "login_failed", userEmail: email, ip, details: { reason: "invalid_credentials" } });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    // Block unverified accounts (skip for admins and users created before verification was added)
    if (user.emailVerified === false && user.verificationToken) {
      return NextResponse.json({ error: "Please verify your email before logging in. Check your inbox for the verification link." }, { status: 403 });
    }
    await audit({ action: "login_success", userId: user._id.toString(), userEmail: email, ip });
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
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
