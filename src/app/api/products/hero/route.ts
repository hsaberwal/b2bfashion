import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { SiteContent } from "@/models/SiteContent";
import { HERO_CONTENT_KEY, normalizeHeroConfig } from "@/lib/heroBanners";

export async function GET() {
  try {
    await connectDB();

    const [products, heroDoc] = await Promise.all([
      Product.find({ showOnHero: true, disabled: { $ne: true } })
        .select("name category colour images heroFocalPoint heroImageIndex heroExcludedIndexes")
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      SiteContent.findOne({ key: HERO_CONTENT_KEY }).lean() as Promise<{ content?: unknown } | null>,
    ]);

    const list = products.map((p) => ({
      id: String(p._id),
      name: p.name,
      category: p.category,
      colour: p.colour,
      images: p.images ?? [],
      heroFocalPoint: p.heroFocalPoint ?? "50% 50%",
      heroImageIndex: p.heroImageIndex ?? 0,
      heroExcludedIndexes: p.heroExcludedIndexes ?? [],
    }));

    const hero = normalizeHeroConfig(heroDoc?.content);

    return NextResponse.json({ products: list, hero });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch hero products" }, { status: 500 });
  }
}
