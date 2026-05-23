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
    // Prevent path traversal
    if (key.includes("..") || !/^[a-zA-Z0-9/_.\-]+$/.test(key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }
    const client = getClient();
    if (!client) {
      return NextResponse.json({ error: "Image service not configured" }, { status: 503 });
    }
    const trimmedKey = key.trim();

    // Optional ?w= asks the Image Service to resize + re-encode (WebP/AVIF) on the
    // fly via its serve/ endpoint, instead of piping the full-resolution original.
    // This is the main lever for fast grids: a thumbnail is a few KB, not several MB.
    const widthRaw = request.nextUrl.searchParams.get("w");
    const width =
      widthRaw && /^\d{1,5}$/.test(widthRaw)
        ? Math.min(Math.max(parseInt(widthRaw, 10), 1), 3000)
        : null;

    // Hint the Image Service to negotiate a modern format when serving.
    const fetchOpts: RequestInit = {
      headers: { Accept: "image/avif,image/webp,image/*,*/*" },
    };

    async function fetchBlob(path: string) {
      const signedUrl = await client!.sign(path);
      return fetch(signedUrl, fetchOpts);
    }

    let imageRes: Response;
    if (width) {
      imageRes = await fetchBlob(`serve/${width}x/blob/${trimmedKey}`);
      // Fall back to the original if resizing isn't available on this service.
      if (!imageRes.ok) {
        imageRes = await fetchBlob(`blob/${trimmedKey}`);
      }
    } else {
      imageRes = await fetchBlob(`blob/${trimmedKey}`);
    }

    if (!imageRes.ok) {
      console.error("Image service fetch failed:", imageRes.status, key);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
    const body = await imageRes.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        // Blob keys are content-addressed (random ids), so a given key+width is
        // immutable — cache hard and let the browser/CDN reuse it.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    console.error("Public signed image error:", e);
    return NextResponse.json({ error: "Failed to get image URL" }, { status: 500 });
  }
}
