import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { requireAdmin } from "@/lib/requireAdmin";

// Placeholder images (replace with your own URLs or uploads)
const SAMPLE_IMAGES = [
  "https://picsum.photos/400/500?random=1",
  "https://picsum.photos/400/500?random=2",
  "https://picsum.photos/400/500?random=3",
  "https://picsum.photos/400/500?random=4",
];

const SAMPLE_PRODUCTS = [
  { sku: "JE-SKIRT-001", name: "White Crinkle Fabric Panelled Skirt", category: "Skirts", colour: "White", packSize: 6, pricePerItem: 26.5 },
  { sku: "JE-TROUS-001", name: "Grey 27\" Leg Detail Pocket Trouser", category: "Trousers", colour: "Grey", packSize: 6, pricePerItem: 28.95 },
  { sku: "JE-BLOUS-001", name: "Ivory Multi Blouse Elasticated Cuff 3/4 Sleeve", category: "Blouses", colour: "Ivory", packSize: 6, pricePerItem: 25 },
  { sku: "JE-CARD-001", name: "Multi Print Waterfall Mock Cardigan 3/4 Sleeve", category: "Cardigans", colour: "Multi", packSize: 6, pricePerItem: 25 },
  { sku: "JE-TOP-001", name: "Flower Print Burn Out Top With Button", category: "Tops", colour: "Multi", packSize: 6, pricePerItem: 26.5 },
  { sku: "JE-TROUS-002", name: "27 Inch Crinkle Trouser", category: "Trousers", colour: "Black", packSize: 6, pricePerItem: 22 },
  { sku: "JE-TOP-002", name: "Flower Print White Lace Top Round Neck 3/4 Sleeve", category: "Tops", colour: "White", packSize: 6, pricePerItem: 22 },
  { sku: "JE-DRESS-001", name: "Gathered Neckline Printed Dress Cap Sleeve", category: "Dresses", colour: "Multi", packSize: 6, pricePerItem: 28 },
  { sku: "JE-KNIT-001", name: "Olive Mock Cardigan 3/4 Sleeve", category: "Knitwear", colour: "Olive", packSize: 6, pricePerItem: 32.5 },
  { sku: "JE-JACK-001", name: "27 Inch Garment Dye Denim Jeans With Belt", category: "Jackets", colour: "Denim", packSize: 6, pricePerItem: 32.5 },
];

export async function POST() {
  try {
    await requireAdmin();
    await connectDB();
    let created = 0;
    for (const p of SAMPLE_PRODUCTS) {
      const exists = await Product.findOne({ sku: p.sku });
      if (exists) continue;
      await Product.create({
        sku: p.sku,
        name: p.name,
        category: p.category,
        stockCategory: "current",
        colour: p.colour,
        packSize: p.packSize,
        pricePerItem: p.pricePerItem,
        images: SAMPLE_IMAGES,
      });
      created++;
    }
    return NextResponse.json({
      ok: true,
      message: `Seed complete. ${created} new products added (${SAMPLE_PRODUCTS.length - created} already existed).`,
      total: SAMPLE_PRODUCTS.length,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
