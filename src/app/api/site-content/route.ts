import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SiteContent } from "@/models/SiteContent";

/** GET — fetch content by key (public) */
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
    await connectDB();
    const doc = await SiteContent.findOne({ key }).lean() as { content?: unknown } | null;
    return NextResponse.json({ content: doc?.content ?? null });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
