import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { PRODUCT_CATEGORIES } from "@/lib/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a helpful fashion assistant for Claudia B2B, a wholesale ladies fashion platform. Your role is to help customers find the right products, suggest styles, and answer questions about our catalogue.

Key facts about Claudia B2B:
- We sell ladies fashion wholesale (bulk orders only)
- Products come in packs (minimum order quantities apply)
- Categories: ${PRODUCT_CATEGORIES.join(", ")}
- Stock types: Current season, Previous season (discounted), and Forward/upcoming stock
- We carry tops, blouses, knitwear, dresses, skirts, jackets, trousers and more

Guidelines:
- Be warm, professional, and knowledgeable about fashion
- Help customers find products by category, colour, style, or occasion
- Suggest complementary pieces and outfit combinations
- If asked about specific products, use the product data provided in context
- Keep responses concise but helpful — 2-3 sentences is ideal for simple questions
- If you don't know something specific about our stock, say so honestly
- Never make up product details, prices, or SKUs
- Direct customers to browse /products for the full catalogue
- For account or order issues, suggest they contact us or log in to their account`;

async function getProductContext(): Promise<string> {
  try {
    await connectDB();
    const products = await Product.find({ stockCategory: { $in: ["current", "previous"] } })
      .select("name category colour sizes packSize description stockCategory sku")
      .sort({ stockCategory: 1, category: 1 })
      .limit(50)
      .lean();

    if (products.length === 0) return "No products currently in the catalogue.";

    const summary = products.map((p) =>
      `- ${p.name} (${p.category}, ${p.colour}${p.sizes?.length ? `, sizes: ${(p.sizes as string[]).join("/")}` : ""}, pack of ${p.packSize}, SKU: ${p.sku}, ${p.stockCategory} stock)${p.description ? ` — ${p.description}` : ""}`
    ).join("\n");

    return `Current catalogue (${products.length} products):\n${summary}`;
  } catch {
    return "Product catalogue is currently unavailable.";
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Chat is not configured. Please set ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required." }, { status: 400 });
    }

    // Fetch product context for the assistant
    const productContext = await getProductContext();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: `${SYSTEM_PROMPT}\n\n${productContext}`,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return Response.json({ message: text });
  } catch (e) {
    console.error("Chat API error:", e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
