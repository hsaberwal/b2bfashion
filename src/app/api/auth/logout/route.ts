import { NextResponse } from "next/server";
import { getSessionToken, clearSessionCookie } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";

export async function POST() {
  try {
    const token = await getSessionToken();
    await clearSessionCookie();
    if (token) {
      await connectDB();
      await Session.deleteOne({ token });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
