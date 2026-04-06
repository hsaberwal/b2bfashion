import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { PRODUCT_CATEGORIES } from "@/lib/types";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM_PROMPT = `You are a helpful fashion assistant for **Claudia B2B** (claudia-c.com), a wholesale ladies fashion platform targeting retailers who buy in bulk.

## About the Business
- Claudia B2B sells **ladies fashion wholesale** — bulk orders only
- Target demographic: women aged 35–55
- Products come in **packs** (e.g. pack of 6) — customers must order in multiples of the pack size
- Stock types: **Current season**, **Previous season** (often discounted), and **Forward/upcoming** stock
- Categories: ${PRODUCT_CATEGORIES.join(", ")}
- Prices are in GBP (£) and only visible to approved wholesale accounts

## Website Pages & Features
- **Homepage** (/) — Hero banner, Featured Styles, and "Our Latest Looks" rotating gallery
- **Products** (/products) — Full catalogue with filters by stock type, category, and colour. Search by SKU, name, or style number
- **Product Detail** (/products/[id]) — Multiple product photos with zoom, size selection, quantity selector. Expandable details and care instructions
- **Cart** (/cart) — View items, edit quantities, remove items. Guest users can add to cart without registering — they only need to log in at checkout
- **Checkout** (/cart/[id]/sign) — Delivery address, payment options (Pay in full, 10% deposit, or Invoice/pay later), and signature to confirm order
- **Register** (/register) — Create a wholesale account
- **Login** (/login) — Log in to existing account
- **Apply** (/apply) — Apply for wholesale access
- **Account** (/account) — Manage delivery address, company details, VAT number

## How Ordering Works
1. Browse products and add to cart (no login required)
2. Go to cart, review items
3. Log in or register to proceed to checkout
4. Enter delivery address, choose payment method, sign to confirm
5. Payment options: pay full amount via Worldpay, pay 10% deposit via Worldpay, or invoice (pay later)

## Your Role
- Help customers find products by category, colour, style, occasion, or description
- Suggest complementary pieces and outfit combinations
- Answer questions about sizing, materials, care instructions, and pack sizes
- Explain how the website works — browsing, ordering, payment, registration
- If asked about a specific product, use the product data provided below
- Guide customers to the right page (e.g. "You can filter by colour on the products page at /products")
- For account issues, suggest visiting /account or contacting support

## Guidelines
- Be warm, professional, and knowledgeable about fashion
- Keep responses concise — 2-3 sentences for simple questions, more for detailed advice
- If you don't know something specific, say so honestly
- Never make up product details, prices, or SKUs that aren't in the data below
- You can recommend browsing the full catalogue at /products if you can't find what they need
- When mentioning products, include the key details: name, colour, category, sizes available`;

async function getProductContext(): Promise<string> {
  try {
    await connectDB();
    const products = await Product.find({ stockCategory: { $in: ["current", "previous"] } })
      .select("name category colour colours sizes packSize description longDescription materials careGuide stockCategory sku pricePerItem")
      .sort({ stockCategory: 1, category: 1 })
      .limit(100)
      .lean();

    if (products.length === 0) return "No products currently in the catalogue.";

    const summary = products.map((p) => {
      const parts = [
        `**${p.name}** (SKU: ${p.sku})`,
        `Category: ${p.category}`,
        `Colour: ${p.colour}${(p.colours as string[] | undefined)?.length ? ` (also: ${(p.colours as string[]).join(", ")})` : ""}`,
      ];
      if ((p.sizes as string[] | undefined)?.length) parts.push(`Sizes: ${(p.sizes as string[]).join(", ")}`);
      parts.push(`Pack size: ${p.packSize}`);
      parts.push(`Stock: ${p.stockCategory}`);
      if (p.pricePerItem) parts.push(`Price: £${(p.pricePerItem as number).toFixed(2)}/item`);
      if (p.description) parts.push(`Description: ${p.description}`);
      if (p.longDescription) parts.push(`Details: ${p.longDescription}`);
      if (p.materials) parts.push(`Materials: ${p.materials}`);
      if (p.careGuide) parts.push(`Care: ${p.careGuide}`);
      return parts.join(" | ");
    }).join("\n");

    // Get category/colour summary
    const categories = [...new Set(products.map((p) => p.category))];
    const colours = [...new Set(products.map((p) => p.colour))];

    return `## Current Catalogue (${products.length} products)
Available categories: ${categories.join(", ")}
Available colours: ${colours.join(", ")}

${summary}`;
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

    const productContext = await getProductContext();

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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
