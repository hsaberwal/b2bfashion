import mongoose from "mongoose";
import { PRODUCT_CATEGORIES } from "@/lib/types";

const productSchema = new mongoose.Schema(
  {
    // Identity (from stock sheet: SPC + colour)
    sku: { type: String, required: true, unique: true, trim: true }, // e.g. "COL13276-BLACK"
    brandCode: String,  // e.g. "CL"
    brand: String,      // e.g. "CLAUDIA-C"
    season: String,     // e.g. "SS26"

    // Descriptive
    name: { type: String, required: true },
    description: String,
    longDescription: String,
    materials: String,
    careGuide: String,
    category: { type: String, required: true, enum: PRODUCT_CATEGORIES },
    stockCategory: {
      type: String,
      required: true,
      enum: ["previous", "current", "forward"],
      default: "current",
    },
    colour: { type: String, required: true },

    // Sizing & packs
    sizes: [String],         // e.g. ["UK-10", "UK-12", "UK-14", "UK-16", "UK-18"]
    sizeRatio: [Number],     // e.g. [1, 2, 2, 2, 1] — matches sizes array order
    packSize: { type: Number, required: true, min: 1 },  // total items per pack
    minPacks: { type: Number, default: 1, min: 1 },       // minimum packs per order

    // Pricing — the admin enters the per-piece (per-garment) wholesale price.
    // The pack price is derived at read time as pricePerPiece * packSize.
    pricePerPiece: Number,

    // Stock tracking
    packsInStock: { type: Number, default: 0, min: 0 },       // physical inventory
    packsReserved: { type: Number, default: 0, min: 0 },       // held by signed orders

    // Media
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },

    // Hero / homepage
    heroFocalPoint: { type: String, default: "50% 50%" },
    heroImageIndex: { type: Number, default: 0 },
    heroExcludedIndexes: { type: [Number], default: [] },
    featured: { type: Boolean, default: false },
    showOnHero: { type: Boolean, default: false },
    latestLooks: { type: Boolean, default: false },

    // Visibility: when true, product is hidden from customers but kept in DB
    disabled: { type: Boolean, default: false },

    createdAt: Date,
    updatedAt: Date,
  },
  { timestamps: true }
);

productSchema.index({ stockCategory: 1 });
productSchema.index({ category: 1 });
productSchema.index({ colour: 1 });
productSchema.index({ season: 1 });
productSchema.index({ disabled: 1 });

export const Product = mongoose.models.Product ?? mongoose.model("Product", productSchema);
