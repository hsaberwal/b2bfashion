import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSessionUser } from "@/lib/requireAdmin";
import { z } from "zod";

const bodySchema = z.object({ secret: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.CLAIM_ADMIN_SECRET;
    if (!expected) {
      return NextResponse.json(
        { error: "Claim admin is not configured. Set CLAIM_ADMIN_SECRET or promote the user in MongoDB." },
        { status: 503 }
      );
    }
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "You must be logged in to claim admin." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input. Send { \"secret\": \"your-secret\" }." }, { status: 400 });
    }
    if (parsed.data.secret !== expected) {
      return NextResponse.json({ error: "Invalid secret." }, { status: 403 });
    }
    await connectDB();
    await User.updateOne({ _id: user.id }, { $set: { role: "admin" } });
    return NextResponse.json({ ok: true, message: "You are now an admin." });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Claim failed." }, { status: 500 });
  }
}
