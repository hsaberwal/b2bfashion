import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { requireAgent } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { nanoid } from "nanoid";
import { makeInviteToken, inviteLink, sendCustomerInviteEmail } from "@/lib/agentInvite";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  companyName: z.string().max(200).optional(),
});

/** POST /api/agent/customers/invite — email a customer a set-password link, linked to this agent. */
export async function POST(request: NextRequest) {
  try {
    const agent = await requireAgent();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid email is required", details: parsed.error.flatten() }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();
    await connectDB();
    if (await User.findOne({ email }).select("_id").lean()) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }
    const { token, expires } = makeInviteToken();
    const customer = await User.create({
      email,
      name: parsed.data.name?.trim(),
      companyName: parsed.data.companyName?.trim(),
      role: "customer",
      agentId: new mongoose.Types.ObjectId(agent.id),
      pricingApproved: false,
      emailVerified: true,
      passwordHash: await hashPassword(nanoid(40)),
      resetToken: token,
      resetTokenExpires: expires,
    });
    await sendCustomerInviteEmail({ to: email, agentName: agent.name, link: inviteLink(token) });
    await audit({
      action: "customer_invited_by_agent",
      userId: agent.id,
      targetType: "user",
      targetId: customer._id.toString(),
      ip: getClientIp(request),
      details: { email },
    });
    return NextResponse.json({ id: customer._id.toString(), email, outstanding: 0 }, { status: 201 });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: agents only" }, { status: 403 });
    console.error("agent invite customer error:", e);
    return NextResponse.json({ error: "Failed to invite customer" }, { status: 500 });
  }
}
