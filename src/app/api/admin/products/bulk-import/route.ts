import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { parseSizeScale } from "@/lib/sizeScale";
import { PRODUCT_CATEGORIES } from "@/lib/types";
import * as XLSX from "xlsx";

/**
 * POST /api/admin/products/bulk-import
 *
 * Accepts an Excel file (.xlsx) from the client stock sheet and imports/updates products.
 *
 * Query params:
 *   dryRun=true — validate only, don't write to DB
 *
 * Headers expected on row 4 (index 3) of Sheet1:
 *   Brand Code | Brand | Category | SPC | Description | Colour | Size Scale |
 *   Pieces Per Pack | Season (Ref 1) | FabComp (Ref 4) | Wholesale (GBP) ... | Packs In Stock
 *
 * Logic:
 * - Each row becomes a product with SKU = {SPC}-{COLOUR}
 * - If SKU exists, update packsInStock, pricePerPack, and materials
 * - If new, create with default stockCategory="current"
 * - Skip rows with empty Brand Code (summary/total rows)
 * - Returns per-row status and summary counts
 */

// Category normalisation: sheet uses uppercase like "TROUSER", we use "Trouser"
const CATEGORY_MAP: Record<string, string> = {
  TROUSER: "Trouser",
  TROUSERS: "Trouser",
  TOP: "Top",
  TOPS: "Top",
  BLOUSE: "Blouse",
  BLOUSES: "Blouse",
  DRESS: "Dress",
  DRESSES: "Dress",
  SKIRT: "Skirt",
  SKIRTS: "Skirt",
  CARDIGAN: "Cardigan",
  CARDIGANS: "Cardigan",
  JUMPER: "Jumper",
  JUMPERS: "Jumper",
  "T-SHIRT": "T-shirt",
  TSHIRT: "T-shirt",
  TUNIC: "Tunic",
  TUNICS: "Tunic",
  GILET: "Gilet",
  GILETS: "Gilet",
  SHRUG: "Shrug",
  SHRUGS: "Shrug",
};

function normaliseCategory(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase();
  const mapped = CATEGORY_MAP[cleaned];
  if (mapped && (PRODUCT_CATEGORIES as readonly string[]).includes(mapped)) return mapped;
  return null;
}

type RowResult = {
  row: number;
  sku: string;
  status: "created" | "updated" | "skipped" | "error";
  message?: string;
};

type ImportSummary = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: RowResult[];
};

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAdmin();

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "Workbook has no sheets" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

    // Find the header row — look for "Brand Code" in any of the first 10 rows
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i] as string[];
      if (row.some((cell) => String(cell).trim() === "Brand Code")) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return NextResponse.json(
        { error: "Could not find header row with 'Brand Code' column" },
        { status: 400 }
      );
    }

    const headers = (rows[headerRowIdx] as string[]).map((h) => String(h).replace(/\s+/g, " ").trim());

    // Map header names to column indexes
    const colIdx = (name: string) => {
      return headers.findIndex((h) => h.toLowerCase().startsWith(name.toLowerCase()));
    };

    const cols = {
      brandCode: colIdx("Brand Code"),
      brand: colIdx("Brand"),
      category: colIdx("Category"),
      sku: colIdx("SPC"),
      name: colIdx("Description"),
      colour: colIdx("Colour"),
      sizeScale: colIdx("Size Scale"),
      packSize: colIdx("Pieces Per Pack"),
      season: colIdx("Season"),
      materials: colIdx("FabComp"),
      price: colIdx("Wholesale"),
      packsInStock: colIdx("Packs In Stock"),
    };

    // Required columns
    const required: [string, number][] = [
      ["SPC (SKU)", cols.sku],
      ["Description", cols.name],
      ["Colour", cols.colour],
      ["Size Scale", cols.sizeScale],
    ];
    for (const [label, idx] of required) {
      if (idx === -1) {
        return NextResponse.json(
          { error: `Required column "${label}" not found in sheet` },
          { status: 400 }
        );
      }
    }

    // Process data rows
    const dataRows = rows.slice(headerRowIdx + 1) as unknown[][];
    const results: RowResult[] = [];

    if (!dryRun) await connectDB();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = headerRowIdx + 2 + i; // 1-indexed for user display

      const brandCodeCell = String(row[cols.brandCode] ?? "").trim();
      if (!brandCodeCell || brandCodeCell.toLowerCase().startsWith("criteria")) {
        // Skip empty rows and summary rows like "Criteria Brand: 'CL'..."
        continue;
      }

      const spc = String(row[cols.sku] ?? "").trim();
      const colour = String(row[cols.colour] ?? "").trim();
      const name = String(row[cols.name] ?? "").trim();
      const sizeScaleStr = String(row[cols.sizeScale] ?? "").trim();
      const categoryRaw = String(row[cols.category] ?? "").trim();
      const brand = String(row[cols.brand] ?? "").trim();
      const season = String(row[cols.season] ?? "").trim();
      const materials = String(row[cols.materials] ?? "").trim();
      const priceNum = parseFloat(String(row[cols.price] ?? "0"));
      const packsInStock = parseInt(String(row[cols.packsInStock] ?? "0"), 10) || 0;
      const sheetPackSize = parseInt(String(row[cols.packSize] ?? "0"), 10) || 0;

      if (!spc || !name || !colour) {
        results.push({ row: rowNum, sku: spc || "(blank)", status: "error", message: "Missing SPC, Description, or Colour" });
        continue;
      }

      // Parse size scale
      const parsed = parseSizeScale(sizeScaleStr);
      if (!parsed) {
        results.push({
          row: rowNum,
          sku: spc,
          status: "error",
          message: `Could not parse Size Scale: "${sizeScaleStr}"`,
        });
        continue;
      }

      // Verify pack size matches size scale
      if (sheetPackSize && sheetPackSize !== parsed.packSize) {
        results.push({
          row: rowNum,
          sku: spc,
          status: "error",
          message: `Pack size mismatch: sheet says ${sheetPackSize}, size scale gives ${parsed.packSize}`,
        });
        continue;
      }

      // Normalise category
      const category = normaliseCategory(categoryRaw);
      if (!category) {
        results.push({
          row: rowNum,
          sku: spc,
          status: "error",
          message: `Unknown category: "${categoryRaw}"`,
        });
        continue;
      }

      // Composite SKU = SPC + colour (slug-safe)
      const compositeSku = `${spc}-${colour.toUpperCase().replace(/\s+/g, "_")}`;

      const productData = {
        sku: compositeSku,
        brandCode: brandCodeCell || undefined,
        brand: brand || undefined,
        season: season || undefined,
        name,
        category,
        colour,
        sizes: parsed.sizes,
        sizeRatio: parsed.ratio,
        packSize: parsed.packSize,
        materials: materials || undefined,
        pricePerPack: priceNum > 0 ? priceNum : undefined,
        packsInStock,
        stockCategory: "current" as const,
      };

      if (dryRun) {
        results.push({
          row: rowNum,
          sku: compositeSku,
          status: "created",
          message: "Would import (dry run)",
        });
        continue;
      }

      try {
        const existing = await Product.findOne({ sku: compositeSku });
        if (existing) {
          // Update: refresh key fields from the sheet, don't touch photos/featured flags
          existing.name = productData.name;
          existing.category = productData.category;
          existing.colour = productData.colour;
          existing.sizes = productData.sizes;
          existing.sizeRatio = productData.sizeRatio;
          existing.packSize = productData.packSize;
          existing.materials = productData.materials;
          existing.pricePerPack = productData.pricePerPack;
          existing.packsInStock = productData.packsInStock;
          existing.brandCode = productData.brandCode;
          existing.brand = productData.brand;
          existing.season = productData.season;
          await existing.save();
          results.push({ row: rowNum, sku: compositeSku, status: "updated" });
        } else {
          await Product.create(productData);
          results.push({ row: rowNum, sku: compositeSku, status: "created" });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Database error";
        results.push({ row: rowNum, sku: compositeSku, status: "error", message: msg });
      }
    }

    const summary: ImportSummary = {
      totalRows: results.length,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };

    if (!dryRun) {
      await audit({
        action: "admin_action",
        userId: sessionUser.id,
        userEmail: sessionUser.email,
        ip: getClientIp(request),
        details: {
          action: "bulk_import",
          filename: file.name,
          ...summary,
          // Trim results in audit log to avoid huge entries
          results: summary.results.slice(0, 50),
        },
      });
    }

    return NextResponse.json({ dryRun, ...summary });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Bulk import error:", e);
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
