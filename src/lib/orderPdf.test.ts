import { describe, it, expect } from "vitest";
import zlib from "zlib";
import { generateOrderPdf, type OrderPdfData } from "./orderPdf";

// Build a guaranteed-valid solid-black RGBA PNG data URL (what signature_pad
// produces). PDFKit embeds these in ~2ms.
function makeValidPngDataUrl(w = 4, h = 4): string {
  const crc32 = (buf: Buffer) => {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter byte
    for (let x = 0; x < w; x++) {
      const o = y * (1 + w * 4) + 1 + x * 4;
      raw[o + 3] = 255; // opaque black
    }
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

const baseData: OrderPdfData = {
  shortCode: "abcd1234",
  signedAt: new Date("2026-01-15T10:00:00Z"),
  customer: { name: "Jane Buyer", companyName: "Buyer Ltd", email: "jane@buyer.test" },
  deliverySnapshot: { addressLine1: "1 High St", city: "Birmingham", postcode: "B1 1AA", country: "UK" },
  items: [
    {
      sku: "COL13361-GREEN",
      productName: "Ribbed Knit Jumper",
      colour: "GREEN",
      quantity: 6,
      packSize: 6,
      sizes: ["UK-10", "UK-12", "UK-14"],
      sizeRatio: [2, 2, 2],
      pricePerPiece: 14.95,
    },
    {
      sku: "COL13224-TEAL",
      productName: "Floral Tea Dress",
      colour: "TEAL",
      quantity: 6,
      packSize: 6,
      sizes: ["UK-10", "UK-12", "UK-14"],
      sizeRatio: [1, 2, 3],
      pricePerPiece: 13.95,
    },
  ],
  total: 173.4,
};

function isPdf(buf: Buffer) {
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

describe("generateOrderPdf", () => {
  it("renders a valid PDF buffer", async () => {
    const buf = await generateOrderPdf(baseData);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("embeds a valid signature image", async () => {
    const buf = await generateOrderPdf({ ...baseData, signatureImage: makeValidPngDataUrl() });
    expect(isPdf(buf)).toBe(true);
  });

  // Regression guard: a malformed PNG must be skipped, never sent to PDFKit
  // (whose decoder would otherwise spin ~15s before throwing).
  it("skips a malformed PNG signature quickly", async () => {
    const start = Date.now();
    const buf = await generateOrderPdf({
      ...baseData,
      signatureImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    });
    expect(isPdf(buf)).toBe(true);
    expect(Date.now() - start).toBeLessThan(3000);
  });

  it("ignores a non-data-url signature value", async () => {
    const buf = await generateOrderPdf({ ...baseData, signatureImage: "enc:deadbeef:cafe:0011" });
    expect(isPdf(buf)).toBe(true);
  });

  it("handles an order with no items", async () => {
    const buf = await generateOrderPdf({ ...baseData, items: [], total: 0 });
    expect(isPdf(buf)).toBe(true);
  });
});
