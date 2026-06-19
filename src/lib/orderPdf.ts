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
  /** Free-text notes from the customer; printed in the Special Instructions box. */
  specialInstructions?: string | null;
  /**
   * The customer's captured signature, as a `data:image/png;base64,…` (or jpeg)
   * data URL. When present it is drawn onto the signature line of the sales sheet.
   */
  signatureImage?: string | null;
};

/** One printed line on the sales sheet: a single product (one SKU per line). */
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

/** One sales-sheet row per order line (one SKU per line), sorted by SKU. */
function buildFormRows(data: OrderPdfData): FormRow[] {
  return [...data.items]
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map((item) => ({
      description: item.productName,
      style: item.sku,
      colour: item.colour ?? "",
      qty: item.quantity,
      price: item.pricePerPiece,
    }));
}

/**
 * Validate that a buffer is a structurally sound PNG. PDFKit's bundled PNG
 * decoder (png-js) will spin for ~15s on a malformed/truncated PNG before
 * throwing "Incomplete or corrupt PNG file", so we must reject bad data
 * *before* handing it to PDFKit — otherwise a single corrupt signature would
 * stall the whole request. A valid PNG decodes in a couple of milliseconds.
 */
function isValidPng(buf: Buffer): boolean {
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  if (buf.length < 8 + 12) return false;
  for (let i = 0; i < 8; i++) if (buf[i] !== SIG[i]) return false;
  // Walk chunks: [len:4][type:4][data:len][crc:4], must end at IEND in-bounds.
  let pos = 8;
  let sawIEND = false;
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const next = pos + 12 + len;
    if (len > buf.length || next > buf.length) return false; // overruns → reject
    if (type === "IEND") {
      sawIEND = true;
      break;
    }
    pos = next;
  }
  return sawIEND;
}

/** Validate a JPEG by its SOI/EOI markers. */
function isValidJpeg(buf: Buffer): boolean {
  return buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

/**
 * Decode a `data:image/png;base64,…` (or jpeg) data URL into a Buffer for
 * PDFKit, returning null unless the bytes are a structurally valid image.
 */
function dataUrlToBuffer(dataUrl: string | null | undefined): Buffer | null {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(m[2], "base64");
  } catch {
    return null;
  }
  const isPng = m[1].toLowerCase() === "png";
  if (isPng ? isValidPng(buf) : isValidJpeg(buf)) return buf;
  return null;
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
      const signature = dataUrlToBuffer(data.signatureImage);

      const pages: FormRow[][] = [];
      for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) pages.push(rows.slice(i, i + ROWS_PER_PAGE));
      if (pages.length === 0) pages.push([]);

      pages.forEach((pageRows, idx) => {
        if (idx > 0) doc.addPage();
        const isLast = idx === pages.length - 1;
        renderFormPage(
          doc, data, pageRows, idx * ROWS_PER_PAGE + 1, isLast, totals, idx + 1, pages.length,
          isLast ? signature : null,
        );
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
  pageCount: number,
  signature: Buffer | null
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
  const instructions = data.specialInstructions?.trim();
  if (instructions) {
    doc.font("Helvetica").fontSize(7.5).fillColor("#000")
      .text(instructions, left + fpad, footerTop + 17, {
        width: leftColW - fpad * 2,
        height: footerH - 22,
        ellipsis: true,
      });
  } else {
    doc.font("Helvetica").fontSize(6.5).fillColor("#000")
      .text("All orders will be despatched when available, unless an alternative date is clearly specified here.",
        left + fpad, footerTop + 18, { width: leftColW - fpad * 2 });
  }

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

  // Fill the buyer's name from the order, and draw the captured signature
  // image over the signature line (last sales page only).
  const buyerName = data.customer?.name || data.deliverySnapshot?.companyName || data.customer?.companyName;
  if (isLastPage && buyerName) {
    doc.font("Helvetica").fontSize(8.5).text(buyerName, splitX + fpad + 60, footerTop + 44, {
      width: contentW - leftColW - fpad * 2 - 60, lineBreak: false, ellipsis: true,
    });
  }
  if (signature) {
    try {
      doc.image(signature, splitX + fpad + 52, footerTop + 49, {
        fit: [Math.min(130, contentW - leftColW - fpad * 2 - 56), 16],
        valign: "bottom",
      });
    } catch {
      // Corrupt/unsupported image data — leave the printed signature line blank.
    }
  }

  doc.fillColor("#000").font("Helvetica").fontSize(6.5)
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
