import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/imageService";

/**
 * GET ?key=products/abc.jpg
 * Public endpoint: proxies the image from Railway Image Service so product images
 * load on the public products page (no redirect = no cross-origin img issues).
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
    const imageRes = await fetch(signedUrl);
    if (!imageRes.ok) {
      console.error("Image service fetch failed:", imageRes.status, key);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
    const body = await imageRes.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("Public signed image error:", e);
    return NextResponse.json({ error: "Failed to get image URL" }, { status: 500 });
  }
}
