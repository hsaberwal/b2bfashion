import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAdmin } from "@/lib/requireAdmin";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    // Support both "files" (multiple) and legacy "file" (single)
    if (files.length === 0) {
      const singleFile = formData.get("file") as File | null;
      if (singleFile) files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No image files provided." }, { status: 400 });
    }

    // Build content blocks: all images first, then the text prompt
    const contentBlocks: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      });
    }

    contentBlocks.push({
      type: "text",
      text: `You are looking at ${files.length > 1 ? `${files.length} photos of clothing labels` : "a clothing label photo"}. These may include materials/composition labels, care instruction labels, size labels, price tags, or brand labels. Look at ALL the images together to extract the complete information.

For care symbols (washing, ironing, bleaching, drying icons), translate them into readable English instructions.

Return the extracted information as JSON only (no markdown, no explanation):

{
  "sku": "the SKU, stock code, or article number if visible on any label, otherwise empty string",
  "productCode": "the product code, style number, or model number if visible (may be different from SKU), otherwise empty string",
  "name": "the product name or description if visible on any label, otherwise empty string",
  "materials": "the full fabric composition, e.g. 95% Polyester, 5% Elastane. Combine info from multiple labels if needed.",
  "careGuide": "all care instructions as a readable sentence, e.g. Machine wash at 30°C, Do not bleach, Iron on low heat, Do not tumble dry. Translate any care symbols you see.",
  "sizes": ["array of ALL sizes if visible on any label, e.g. S, M, L, XL"],
  "colour": "colour name if visible on any label, otherwise empty string",
  "pricePerItem": "the price as a number (no currency symbol), e.g. 29.99. Use the original/retail price if multiple prices shown. Empty string if not visible."
}

If a field is not visible on any of the labels, use an empty string (or empty array for sizes).
Only return valid JSON, nothing else.`,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not parse label information." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("Scan label error:", e);
    return NextResponse.json(
      { error: err.message ?? "Label scan failed" },
      { status: 500 }
    );
  }
}
