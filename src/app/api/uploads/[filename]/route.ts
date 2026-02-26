import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const volumePath = process.env.UPLOAD_VOLUME_PATH;
  if (!volumePath) {
    return NextResponse.json({ error: "Uploads not configured" }, { status: 503 });
  }

  const { filename } = await params;
  // Prevent path traversal: only allow one segment, alphanumeric + dot + extension
  const safe = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
  if (!safe) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const filePath = path.join(volumePath, "uploads", filename);
  try {
    const buf = await readFile(filePath);
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
