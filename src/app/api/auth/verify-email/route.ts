import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Called when user clicks the verification link in their email.
 * Marks the account as verified and redirects to login.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return redirectWithMessage("Invalid verification link.", "error");
    }

    await connectDB();
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return redirectWithMessage("Invalid or expired verification link.", "error");
    }

    if (user.emailVerified) {
      return redirectWithMessage("Your email is already verified. Please log in.", "info");
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    await audit({
      action: "register",
      userId: user._id.toString(),
      userEmail: user.email,
      ip: getClientIp(request),
      details: { step: "email_verified" },
    });

    return redirectWithMessage("Email verified! You can now log in.", "success");
  } catch (e) {
    console.error("Email verification error:", e);
    return redirectWithMessage("Verification failed. Please try again.", "error");
  }
}

function redirectWithMessage(message: string, type: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return NextResponse.redirect(
    `${baseUrl}/login?verified=${type}&message=${encodeURIComponent(message)}`
  );
}
