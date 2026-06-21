import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { nanoid } from "nanoid";
import { makeInviteToken, inviteLink, sendAgentInviteEmail } from "@/lib/agentInvite";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

/** GET /api/admin/agents — list agents with their assigned-customer counts (admin only). */
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();
    const agents = await User.find({ role: "agent" })
      .select("email name active emailVerified createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // One aggregate for all customer counts grouped by agent.
    const counts = await User.aggregate([
      { $match: { agentId: { $ne: null }, role: "customer" } },
      { $group: { _id: "$agentId", count: { $sum: 1 } } },
    ]);
    const countByAgent = new Map(counts.map((c) => [String(c._id), c.count as number]));

    return NextResponse.json({
      agents: agents.map((a) => ({
        id: String(a._id),
        email: a.email,
        name: a.name,
        active: a.active ?? true,
        emailVerified: a.emailVerified ?? false,
        customerCount: countByAgent.get(String(a._id)) ?? 0,
        createdAt: a.createdAt,
      })),
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("list agents error:", e);
    return NextResponse.json({ error: "Failed to list agents" }, { status: 500 });
  }
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
});

/** POST /api/admin/agents — create an agent and email them an invite to set up (admin only). */
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAdmin();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid email is required", details: parsed.error.flatten() }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const name = parsed.data.name?.trim();

    await connectDB();
    const existing = await User.findOne({ email }).select("role").lean();
    if (existing) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }

    // Placeholder password — the agent sets their own via the invite link.
    const passwordHash = await hashPassword(nanoid(40));
    const { token, expires } = makeInviteToken();

    const agent = await User.create({
      email,
      name,
      role: "agent",
      active: true,
      emailVerified: true, // invited by an admin; no separate email-verify step
      passwordHash,
      resetToken: token,
      resetTokenExpires: expires,
    });

    await sendAgentInviteEmail({ to: email, name, link: inviteLink(token) });

    await audit({
      action: "agent_created",
      userId: sessionUser.id,
      targetType: "user",
      targetId: agent._id.toString(),
      ip: getClientIp(request),
      details: { email },
    });

    return NextResponse.json({ id: agent._id.toString(), email, name, active: true, customerCount: 0 }, { status: 201 });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("create agent error:", e);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
