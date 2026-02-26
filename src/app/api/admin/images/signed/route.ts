import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getClient } from "@/lib/imageService";

/**
 * GET ?key=products/abc.jpg
 * Redirects to the Railway Image Service signed URL for that blob key.
 * Used by the admin product form to display images stored as blob keys.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const key = request.nextUrl.searchParams.get("key");
    if (!key || !key.trim()) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }
    const client = getClient();
    if (!client) {
      return NextResponse.json({ error: "Image service not configured" }, { status: 503 });
    }
    // Use raw blob path so thumbnails work even if serve/ resizing isn't configured
    const path = `blob/${key.trim()}`;
    const signedUrl = await client.sign(path);
    return NextResponse.redirect(signedUrl);
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("Signed image error:", e);
    return NextResponse.json({ error: "Failed to get image URL" }, { status: 500 });
  }
}
