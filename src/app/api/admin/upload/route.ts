import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { v2 as cloudinary } from "cloudinary";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import {
  isImageServiceConfigured,
  getClient,
  getProductBlobKeyPrefix,
} from "@/lib/imageService";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const useImageService = isImageServiceConfigured();
    const volumePath = process.env.UPLOAD_VOLUME_PATH;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const useCloudinary = cloudName && apiKey && apiSecret;

    if (!useImageService && !volumePath && !useCloudinary) {
      return NextResponse.json(
        {
          error:
            "Image upload not configured. Deploy Railway Image Service and set IMAGE_SERVICE_URL + IMAGE_SERVICE_SECRET_KEY, or add a Volume + UPLOAD_VOLUME_PATH, or set CLOUDINARY_* env vars. You can also add image URLs manually.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided. Use form field 'file'." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, WebP or GIF." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    const ext = EXT_MAP[file.type] ?? "jpg";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1) Railway Image Service (recommended: resize, WebP/AVIF on the fly)
    if (useImageService) {
      const client = getClient();
      if (!client) {
        return NextResponse.json({ error: "Image service client not available" }, { status: 503 });
      }
      const blobKey = `${getProductBlobKeyPrefix()}${nanoid(12)}.${ext}`;
      const res = await client.put(blobKey, buffer);
      if (!res.ok) {
        const text = await res.text();
        console.error("Image service PUT failed:", res.status, text);
        return NextResponse.json({ error: "Upload to image service failed" }, { status: 502 });
      }
      return NextResponse.json({ url: blobKey });
    }

    // 2) Railway Volume
    if (volumePath) {
      const filename = `${nanoid(12)}.${ext}`;
      const dir = path.join(volumePath, "uploads");
      await mkdir(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      await writeFile(filePath, buffer);
      return NextResponse.json({ url: `/api/uploads/${filename}` });
    }

    // 3) Cloudinary
    cloudinary.config({ cloud_name: cloudName!, api_key: apiKey!, api_secret: apiSecret! });
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload(base64, { resource_type: "image" }, (err, res) => {
        if (err) reject(err);
        else if (res?.secure_url) resolve({ secure_url: res.secure_url });
        else reject(new Error("Upload failed"));
      });
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
