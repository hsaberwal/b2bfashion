import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import {
  getFetchableImageUrl,
  getClient,
  getProductBlobKeyPrefix,
  isImageServiceConfigured,
} from "@/lib/imageService";
import { fashnRun, fashnPollUntilComplete, isFashnConfigured } from "@/lib/fashn";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import { z } from "zod";

const bodySchema = z.object({
  productId: z.string(),
  imageIndex: z.number().int().min(0).optional(),
  prompt: z.string().optional(),
  num_images: z.number().int().min(1).max(4).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    if (!isFashnConfigured()) {
      return NextResponse.json(
        { error: "FASHN is not configured. Set FASHN_API_KEY in your environment." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, imageIndex = 0, prompt, num_images = 1 } = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    await connectDB();
    const raw = await Product.findById(productId).lean();
    if (!raw || Array.isArray(raw)) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const product = raw as { images?: string[] };
    const images = (product.images ?? []) as string[];
    if (!images.length || imageIndex >= images.length) {
      return NextResponse.json(
        { error: "Product has no image at that index. Add at least one product image first." },
        { status: 400 }
      );
    }

    const garmentImageValue = images[imageIndex];
    const productImageUrl = await getFetchableImageUrl(garmentImageValue);

    const predictionId = await fashnRun({
      product_image: productImageUrl,
      prompt: prompt?.trim() || undefined,
      num_images,
      aspect_ratio: "3:4",
      resolution: "1k",
      output_format: "png",
    });

    const outputUrls = await fashnPollUntilComplete(predictionId);

    const client = getClient();
    const storedUrls: string[] = [];

    if (isImageServiceConfigured() && client) {
      for (const url of outputUrls) {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        const key = `${getProductBlobKeyPrefix()}generated/${nanoid(12)}.png`;
        const putRes = await client.put(key, buffer);
        if (putRes.ok) {
          storedUrls.push(key);
        } else {
          storedUrls.push(url);
        }
      }
    } else {
      storedUrls.push(...outputUrls);
    }

    return NextResponse.json({ urls: storedUrls });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("Generate model photos error:", e);
    return NextResponse.json(
      { error: err.message ?? "Generation failed" },
      { status: 500 }
    );
  }
}
