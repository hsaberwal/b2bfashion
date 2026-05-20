import PDFDocument from "pdfkit";

// Hard-coded business header (matches the Order Sheet.xlsx template).
const COMPANY_NAME = "CLAUDIA.C";
const COMPANY_LINES = [
  "32-34 Sampson Road North, B11 1BL",
  "Tel: 0121 693 6030",
  "Office Mobile: 07415 646 024",
  "Email: cul.admin@coleridgeuk.com",
];

export type OrderPdfItem = {
  sku: string;
  productName: string;
  colour?: string;
  /** Total units across the whole order line. */
  quantity: number;
  packSize: number;
  /** Sizes array (e.g. ["UK-10","UK-12","UK-14"]). */
  sizes?: string[];
  /** Pack ratio matching sizes order (e.g. [1,2,2]). */
  sizeRatio?: number[];
  pricePerPiece?: number;
};

export type OrderPdfData = {
  shortCode: string;
  signedAt?: Date | string | null;
  customer?: {
    name?: string;
    companyName?: string;
    email?: string;
    vatNumber?: string;
  } | null;
  deliverySnapshot?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    country?: string;
    companyName?: string;
    vatNumber?: string;
  } | null;
  items: OrderPdfItem[];
  total: number;
};

function fmtGBP(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `£${n.toFixed(2)}`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Expand one order line into one (size, qty) row per size in the pack ratio. */
function expandPicks(item: OrderPdfItem): { size: string; qty: number }[] {
  const sizes = item.sizes ?? [];
  const ratio = item.sizeRatio ?? [];
  const packs = item.packSize > 0 ? Math.floor(item.quantity / item.packSize) : 0;
  if (sizes.length === 0 || ratio.length === 0 || packs === 0 || sizes.length !== ratio.length) {
    // Fallback: one row with the whole quantity, no size.
    return [{ size: item.sizes?.[0] ?? "—", qty: item.quantity }];
  }
  const out: { size: string; qty: number }[] = [];
  for (let i = 0; i < sizes.length; i++) {
    const qty = packs * (ratio[i] ?? 0);
    if (qty > 0) out.push({ size: sizes[i], qty });
  }
  return out;
}

export function generateOrderPdf(data: OrderPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      renderSalesOrder(doc, data);
      doc.addPage();
      renderPickingList(doc, data);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function renderSalesOrder(doc: PDFKit.PDFDocument, data: OrderPdfData) {
  const pageW = doc.page.width;
  const margin = doc.page.margins.left;
  const contentW = pageW - margin * 2;

  // Title
  doc.fontSize(20).font("Helvetica-Bold").text("SALES ORDER", margin, margin, { align: "center", width: contentW });
  doc.moveDown(0.4);
  doc.fontSize(11).font("Helvetica").text(`No. ${data.shortCode}`, { align: "center", width: contentW });

  doc.moveDown(1);
  const headerY = doc.y;

  // Left column: company
  doc.fontSize(11).font("Helvetica-Bold").text(COMPANY_NAME, margin, headerY);
  doc.font("Helvetica").fontSize(9);
  for (const line of COMPANY_LINES) doc.text(line, margin);

  // Right column: order date
  const rightX = margin + contentW / 2 + 20;
  doc.fontSize(10).font("Helvetica-Bold").text("Order Date:", rightX, headerY);
  doc.font("Helvetica").fontSize(10).text(fmtDate(data.signedAt), rightX, headerY + 14);

  doc.moveDown(1.5);
  let y = Math.max(doc.y, headerY + 90);

  // Supply to + invoice address
  const colW = (contentW - 20) / 2;
  doc.fontSize(10).font("Helvetica-Bold").text("Supply To:", margin, y);
  doc.font("Helvetica").fontSize(10);
  const supplyLines = buildAddressLines(data);
  for (const line of supplyLines) doc.text(line, margin, doc.y, { width: colW });

  doc.fontSize(10).font("Helvetica-Bold").text("Invoice Address:", margin + colW + 20, y);
  doc.font("Helvetica").fontSize(10).text("(same as Supply To)", margin + colW + 20, y + 14, { width: colW });

  doc.moveDown(1.5);
  y = doc.y + 8;

  // Item table
  const cols = [
    { key: "description", label: "Description", width: 180 },
    { key: "style",       label: "Style",       width:  80 },
    { key: "colour",      label: "Colour",      width:  70 },
    { key: "qty",         label: "Qty",         width:  50, align: "right" as const },
    { key: "price",       label: "Price ex-VAT", width: 85, align: "right" as const },
    { key: "lineTotal",   label: "Line Total",  width:  50, align: "right" as const },
  ];

  // Header row
  drawTableRow(doc, margin, y, cols, {
    description: "Description",
    style: "Style",
    colour: "Colour",
    qty: "Qty",
    price: "Price ex-VAT",
    lineTotal: "Line Total",
  }, { bold: true, fill: "#f3f3f3" });
  y += 20;

  // Data rows
  let subtotal = 0;
  for (const item of data.items) {
    const line = (item.pricePerPiece ?? 0) * item.quantity;
    subtotal += line;
    drawTableRow(doc, margin, y, cols, {
      description: item.productName,
      style: item.sku,
      colour: item.colour ?? "",
      qty: String(item.quantity),
      price: fmtGBP(item.pricePerPiece),
      lineTotal: fmtGBP(line),
    });
    y += 22;
    if (y > doc.page.height - 120) { doc.addPage(); y = margin; }
  }

  // Total row
  y += 4;
  doc.font("Helvetica-Bold").fontSize(10);
  const totalX = margin + cols.slice(0, 4).reduce((s, c) => s + c.width, 0);
  doc.text("Subtotal (ex-VAT):", totalX, y, { width: cols[4].width, align: "right" });
  doc.text(fmtGBP(subtotal), totalX + cols[4].width, y, { width: cols[5].width, align: "right" });

  // Footer
  y = doc.page.height - 110;
  doc.font("Helvetica-Bold").fontSize(9).text("Special Instructions", margin, y);
  doc.font("Helvetica").fontSize(8).text(
    "All orders will be despatched when available unless an alternative date is specified. All pricing is ex works, terms 30 days nett. No cancellations accepted once orders are in production.",
    margin, y + 12, { width: contentW }
  );

  y = doc.page.height - 60;
  doc.fontSize(9).font("Helvetica").text("Buyer's Name: ______________________________", margin, y);
  doc.text("Signature: ____________________________________", margin + contentW / 2, y);
}

function buildAddressLines(data: OrderPdfData): string[] {
  const out: string[] = [];
  const ds = data.deliverySnapshot ?? {};
  const customer = data.customer ?? {};
  const companyName = ds.companyName || customer.companyName;
  if (companyName) out.push(companyName);
  if (customer.name) out.push(customer.name);
  if (ds.addressLine1) out.push(ds.addressLine1);
  if (ds.addressLine2) out.push(ds.addressLine2);
  const cityPostcode = [ds.city, ds.postcode].filter(Boolean).join("  ");
  if (cityPostcode) out.push(cityPostcode);
  if (ds.country) out.push(ds.country);
  if (customer.email) out.push(`Email: ${customer.email}`);
  const vat = ds.vatNumber || customer.vatNumber;
  if (vat) out.push(`VAT: ${vat}`);
  return out.length ? out : ["(no delivery details on file)"];
}

function renderPickingList(doc: PDFKit.PDFDocument, data: OrderPdfData) {
  const pageW = doc.page.width;
  const margin = doc.page.margins.left;
  const contentW = pageW - margin * 2;

  doc.fontSize(18).font("Helvetica-Bold").text(`Picking List — Order #${data.shortCode}`, margin, margin, { width: contentW });
  doc.fontSize(10).font("Helvetica").fillColor("#555")
    .text(`Signed ${fmtDate(data.signedAt)} · Pick the quantities below by size and tick each row when done.`, { width: contentW });
  doc.fillColor("#000");

  doc.moveDown(1);

  // Build flat rows: one per (SKU, size, qty), sorted by SKU.
  type PickRow = { sku: string; description: string; colour: string; size: string; qty: number };
  const rows: PickRow[] = [];
  for (const item of [...data.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
    for (const pick of expandPicks(item)) {
      rows.push({
        sku: item.sku,
        description: item.productName,
        colour: item.colour ?? "",
        size: pick.size,
        qty: pick.qty,
      });
    }
  }

  const cols = [
    { key: "sku",         label: "SKU",         width: 110 },
    { key: "description", label: "Description", width: 200 },
    { key: "colour",      label: "Colour",      width:  70 },
    { key: "size",        label: "Size",        width:  55 },
    { key: "qty",         label: "Qty",         width:  45, align: "right" as const },
    { key: "tick",        label: "✓",           width:  35, align: "center" as const },
  ];

  let y = doc.y + 4;
  drawTableRow(doc, margin, y, cols, {
    sku: "SKU", description: "Description", colour: "Colour", size: "Size", qty: "Qty", tick: "✓",
  }, { bold: true, fill: "#f3f3f3" });
  y += 22;

  let lastSku = "";
  let totalGarments = 0;
  for (const row of rows) {
    // Visual grouping: thin separator when SKU changes.
    if (lastSku && row.sku !== lastSku) {
      doc.strokeColor("#e5e5e5").lineWidth(0.5).moveTo(margin, y - 2).lineTo(margin + contentW, y - 2).stroke();
      doc.strokeColor("#000");
    }
    lastSku = row.sku;
    drawTableRow(doc, margin, y, cols, {
      sku: row.sku,
      description: row.description,
      colour: row.colour,
      size: row.size,
      qty: String(row.qty),
      tick: "☐",
    });
    totalGarments += row.qty;
    y += 22;
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = margin;
      drawTableRow(doc, margin, y, cols, {
        sku: "SKU", description: "Description", colour: "Colour", size: "Size", qty: "Qty", tick: "✓",
      }, { bold: true, fill: "#f3f3f3" });
      y += 22;
    }
  }

  // Grand total
  y += 4;
  doc.font("Helvetica-Bold").fontSize(11);
  const totalLabelX = margin + cols.slice(0, 4).reduce((s, c) => s + c.width, 0);
  doc.text("Total garments to pick:", totalLabelX, y, { width: cols[4].width + 40, align: "right" });
  doc.text(String(totalGarments), totalLabelX + cols[4].width + 40, y, { width: cols[5].width, align: "right" });
}

type ColDef = { key: string; label: string; width: number; align?: "left" | "right" | "center" };

function drawTableRow(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  cols: ColDef[],
  values: Record<string, string>,
  opts?: { bold?: boolean; fill?: string }
) {
  const rowH = 20;
  if (opts?.fill) {
    const totalW = cols.reduce((s, c) => s + c.width, 0);
    doc.save().rect(x, y - 4, totalW, rowH).fill(opts.fill).restore();
  }
  doc.font(opts?.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor("#000");
  let cx = x;
  for (const c of cols) {
    const text = values[c.key] ?? "";
    doc.text(text, cx + 4, y, { width: c.width - 8, align: c.align ?? "left", lineBreak: false, ellipsis: true });
    cx += c.width;
  }
}
