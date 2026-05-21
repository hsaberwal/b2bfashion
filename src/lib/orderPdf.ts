import PDFDocument from "pdfkit";

// Hard-coded business header (matches the Order Sheet.xlsx / ordersheet.pdf template).
const COMPANY_NAME = "CLAUDIA.C";
const COMPANY_LINES = [
  "Office Mobile: 07415 646 024",
  "Tel: 0121 693 6030",
  "Email: cul.admin@coleridgeuk.com",
  "32-34 Sampson Road North, B11 1BL",
];

const ROWS_PER_PAGE = 16;

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

/** One printed line on the form: a single size of a single product. */
type FormRow = {
  description: string;
  style: string;
  colour: string;
  qty: number;
  price?: number;
};

function fmtGBP(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `£${n.toFixed(2)}`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Expand one order line into one (size, qty) row per size in the pack ratio. */
function expandPicks(item: OrderPdfItem): { size: string; qty: number }[] {
  const sizes = item.sizes ?? [];
  const ratio = item.sizeRatio ?? [];
  const packs = item.packSize > 0 ? Math.floor(item.quantity / item.packSize) : 0;
  if (sizes.length === 0 || ratio.length === 0 || packs === 0 || sizes.length !== ratio.length) {
    // Fallback: one row with the whole quantity, no size.
    return [{ size: item.sizes?.[0] ?? "", qty: item.quantity }];
  }
  const out: { size: string; qty: number }[] = [];
  for (let i = 0; i < sizes.length; i++) {
    const qty = packs * (ratio[i] ?? 0);
    if (qty > 0) out.push({ size: sizes[i], qty });
  }
  return out;
}

/** Flatten every order line into per-size form rows, sorted by SKU. */
function buildFormRows(data: OrderPdfData): FormRow[] {
  const rows: FormRow[] = [];
  for (const item of [...data.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
    for (const pick of expandPicks(item)) {
      const size = pick.size && pick.size !== "—" ? pick.size : "";
      rows.push({
        description: size ? `${item.productName} — ${size}` : item.productName,
        style: item.sku,
        colour: item.colour ?? "",
        qty: pick.qty,
        price: item.pricePerPiece,
      });
    }
  }
  return rows;
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

type Col = { key: keyof FormRow | "misc"; label: string; width: number; align: "left" | "center" | "right" };

// Column layout (widths sum to the A4 content width of 515.28pt).
const COLS: Col[] = [
  { key: "description", label: "Description",      width: 196,   align: "left" },
  { key: "misc",        label: "Misc",             width: 70,    align: "left" },
  { key: "style",       label: "Style",            width: 66,    align: "center" },
  { key: "colour",      label: "Colour",           width: 55,    align: "center" },
  { key: "qty",         label: "Quantity",         width: 48,    align: "center" },
  { key: "price",       label: "Price\nExe. Vat",  width: 80.28, align: "center" },
];

export function generateOrderPdf(data: OrderPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const rows = buildFormRows(data);
      const totals = {
        pieces: rows.reduce((s, r) => s + r.qty, 0),
        exVat: data.total,
      };

      const pages: FormRow[][] = [];
      for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) pages.push(rows.slice(i, i + ROWS_PER_PAGE));
      if (pages.length === 0) pages.push([]);

      pages.forEach((pageRows, idx) => {
        if (idx > 0) doc.addPage();
        renderFormPage(doc, data, pageRows, idx * ROWS_PER_PAGE + 1, idx === pages.length - 1, totals, idx + 1, pages.length);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function renderFormPage(
  doc: PDFKit.PDFDocument,
  data: OrderPdfData,
  rows: FormRow[],
  startNum: number,
  isLastPage: boolean,
  totals: { pieces: number; exVat: number },
  pageNo: number,
  pageCount: number
) {
  const margin = doc.page.margins.left;
  const left = margin;
  const contentW = doc.page.width - margin * 2; // 515.28pt
  const right = left + contentW;

  const leftColW = 250;          // company / supply-to column width
  const splitX = left + leftColW; // divider between left and right header columns

  const headerTop = margin;
  const headerH = 92;
  const addrTop = headerTop + headerH;
  const addrH = 74;
  const tableTop = addrTop + addrH;
  const thH = 24;                 // table header row
  const rowH = 22;
  const rowsTop = tableTop + thH;
  const tableBottom = rowsTop + rowH * ROWS_PER_PAGE;
  const footerTop = tableBottom;
  const footerH = 96;
  const formBottom = footerTop + footerH;

  doc.lineWidth(0.8).strokeColor("#000").fillColor("#000");

  // ---------- HEADER: company + sales order no + order date ----------
  doc.font("Helvetica-Bold").fontSize(11)
    .text(`SALES ORDER No. ${data.shortCode}`, splitX + 6, headerTop + 4, { width: contentW - leftColW - 12 });
  if (pageCount > 1) {
    doc.font("Helvetica").fontSize(8).fillColor("#555")
      .text(`Page ${pageNo} of ${pageCount}`, splitX + 6, headerTop + 4, { width: contentW - leftColW - 12, align: "right" });
    doc.fillColor("#000");
  }

  doc.font("Helvetica-Bold").fontSize(16).text(COMPANY_NAME, left, headerTop + 10, { width: leftColW, align: "center" });
  doc.font("Helvetica").fontSize(8);
  let cy = headerTop + 33;
  for (const line of COMPANY_LINES) {
    doc.text(line, left, cy, { width: leftColW, align: "center" });
    cy += 10;
  }

  doc.font("Helvetica-Bold").fontSize(9).text("Order Date:", splitX + 6, headerTop + 30);
  doc.font("Helvetica").fontSize(9).text(fmtDate(data.signedAt), splitX + 70, headerTop + 30, { width: contentW - leftColW - 76 });

  // ---------- ADDRESS BLOCK: supply to / invoice address ----------
  doc.font("Helvetica-Bold").fontSize(9).text("Supply to:", left + 4, addrTop + 4);
  doc.font("Helvetica").fontSize(8.5);
  let ay = addrTop + 17;
  for (const line of buildAddressLines(data)) {
    if (ay > addrTop + addrH - 9) break;
    doc.text(line, left + 4, ay, { width: leftColW - 8, lineBreak: false, ellipsis: true });
    ay += 10;
  }
  doc.font("Helvetica-Bold").fontSize(9)
    .text("Invoice Address (if different)", splitX + 6, addrTop + 4, { width: contentW - leftColW - 10 });

  // ---------- TABLE HEADER ----------
  doc.font("Helvetica-Bold").fontSize(9);
  let hx = left;
  for (const c of COLS) {
    doc.text(c.label, hx + 3, addrTop + addrH + 5, { width: c.width - 6, align: c.align });
    hx += c.width;
  }

  // ---------- DATA ROWS ----------
  for (let i = 0; i < ROWS_PER_PAGE; i++) {
    const rowY = rowsTop + i * rowH;
    const num = startNum + i;
    const row = rows[i];
    // Row number (sits at the far left of the Description cell).
    doc.font("Helvetica").fontSize(7).fillColor("#555").text(String(num), left + 2, rowY + 3, { width: 14 });
    doc.fillColor("#000");
    if (!row) continue;

    doc.fontSize(8.5);
    let cx = left;
    for (const c of COLS) {
      const padLeft = c.key === "description" ? 18 : 4;
      let value = "";
      if (c.key === "description") value = row.description;
      else if (c.key === "style") value = row.style;
      else if (c.key === "colour") value = row.colour;
      else if (c.key === "qty") value = String(row.qty);
      else if (c.key === "price") value = fmtGBP(row.price);
      // "misc" stays blank.
      if (value) {
        doc.text(value, cx + padLeft, rowY + 4, { width: c.width - padLeft - 4, align: c.align, lineBreak: true });
      }
      cx += c.width;
    }
  }

  // ---------- FOOTER ----------
  const fpad = 5;
  doc.font("Helvetica-Bold").fontSize(9).text("Special Instructions", left + fpad, footerTop + fpad);
  doc.font("Helvetica").fontSize(6.5)
    .text("All orders will be despatched when available, unless an alternative date is clearly specified here.",
      left + fpad, footerTop + 18, { width: leftColW - fpad * 2 });

  doc.font("Helvetica").fontSize(6.5)
    .text("All pricing is ex works, terms 30 days nett. No cancellations accepted once orders are in production.",
      splitX + fpad, footerTop + fpad, { width: contentW - leftColW - fpad * 2 });

  if (isLastPage) {
    doc.font("Helvetica-Bold").fontSize(9)
      .text(`Order total (ex VAT): ${fmtGBP(totals.exVat)}   ·   ${totals.pieces} pcs`,
        splitX + fpad, footerTop + 24, { width: contentW - leftColW - fpad * 2 });
  }

  doc.font("Helvetica").fontSize(8.5)
    .text("Buyers Name.................................................................", splitX + fpad, footerTop + 44, { width: contentW - leftColW - fpad * 2 })
    .text("Signature.......................................................................", splitX + fpad, footerTop + 58, { width: contentW - leftColW - fpad * 2 });
  doc.fontSize(6.5)
    .text("No order accepted without signature. No cancellations accepted once orders are in production.",
      splitX + fpad, footerTop + 76, { width: contentW - leftColW - fpad * 2 });

  // ---------- GRID / BORDERS (drawn last, over the content) ----------
  doc.lineWidth(0.8).strokeColor("#000");
  // Outer border
  doc.rect(left, headerTop, contentW, formBottom - headerTop).stroke();
  // Horizontal section dividers
  hLine(doc, left, right, addrTop);     // header / address
  hLine(doc, left, right, tableTop);    // address / table header
  hLine(doc, left, right, rowsTop);     // table header / rows
  hLine(doc, left, right, footerTop);   // rows / footer
  // Vertical split in header + address blocks
  vLine(doc, splitX, headerTop, tableTop);
  vLine(doc, splitX, footerTop, formBottom);

  // Table column verticals (from table header down to footer)
  doc.lineWidth(0.5).strokeColor("#000");
  let vx = left;
  for (const c of COLS) {
    vx += c.width;
    if (vx < right - 0.5) vLine(doc, vx, tableTop, footerTop);
  }
  // Light row separators
  doc.lineWidth(0.4).strokeColor("#bbb");
  for (let i = 1; i < ROWS_PER_PAGE; i++) hLine(doc, left, right, rowsTop + i * rowH);
  doc.strokeColor("#000");
}

function hLine(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number) {
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
}

function vLine(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number) {
  doc.moveTo(x, y1).lineTo(x, y2).stroke();
}
