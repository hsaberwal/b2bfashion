import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { audit } from "@/lib/audit";
import { VERIFICATION_WINDOW_MS } from "@/lib/signupHygiene";

/**
 * POST /api/admin/cleanup-unverified
 *
 * Deletes all unverified user accounts whose verification window has elapsed.
 * Can be called by:
 * - Admin manually from the admin panel
 * - A cron job / scheduled task
 * - Railway cron trigger
 *
 * Also runs automatically on every login attempt (lightweight check).
 */
export async function POST() {
  try {
    await connectDB();
    const cutoff = new Date(Date.now() - VERIFICATION_WINDOW_MS);

    // Find unverified users with a verification token, created more than 24 hours ago
    const expired = await User.find({
      emailVerified: false,
      verificationToken: { $exists: true, $ne: null },
      createdAt: { $lt: cutoff },
    }).select("email createdAt");

    if (expired.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const emails = expired.map((u) => u.email);

    const result = await User.deleteMany({
      emailVerified: false,
      verificationToken: { $exists: true, $ne: null },
      createdAt: { $lt: cutoff },
    });

    await audit({
      action: "admin_action",
      details: {
        action: "cleanup_unverified",
        deleted: result.deletedCount,
        emails,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: result.deletedCount,
      emails,
    });
  } catch (e) {
    console.error("Cleanup error:", e);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
