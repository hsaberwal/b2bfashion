import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({
      ok: true,
      database: "connected",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Health check failed:", e);
    return NextResponse.json(
      { ok: false, database: "disconnected", error: message },
      { status: 503 }
    );
  }
}
