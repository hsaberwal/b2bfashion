import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/imageService";

/**
 * GET ?key=products/abc.jpg
 * Public endpoint: redirects to the Railway Image Service signed URL for that blob key.
 * Used by product list and product detail pages so images load without admin auth.
 */
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    if (!key || !key.trim()) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }
    const client = getClient();
    if (!client) {
      return NextResponse.json({ error: "Image service not configured" }, { status: 503 });
    }
    const path = `blob/${key.trim()}`;
    const signedUrl = await client.sign(path);
    return NextResponse.redirect(signedUrl);
  } catch (e) {
    console.error("Public signed image error:", e);
    return NextResponse.json({ error: "Failed to get image URL" }, { status: 500 });
  }
}
