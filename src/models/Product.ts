import mongoose from "mongoose";
import { PRODUCT_CATEGORIES } from "@/lib/types";

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    productCode: String,
    barcode: String,
    styleNumber: String,
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
    },
    colour: { type: String, required: true },
    colours: [String],
    sizes: [String],            // e.g. ["XS", "S", "M", "L"]
    sizeRatio: [Number],        // e.g. [1, 1, 2, 2] — matches sizes array order
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },
    heroFocalPoint: { type: String, default: "50% 50%" }, // CSS object-position, e.g. "50% 30%"
    heroImageIndex: { type: Number, default: 0 }, // Which image to use on Front Page
    featured: { type: Boolean, default: false },
    showOnHero: { type: Boolean, default: false },
    latestLooks: { type: Boolean, default: false },
    packSize: { type: Number, required: true, min: 1 },
    minPacks: { type: Number, default: 1, min: 1 },
    pricePerPack: Number,
    createdAt: Date,
    updatedAt: Date,
  },
  { timestamps: true }
);

productSchema.index({ stockCategory: 1 });
productSchema.index({ category: 1 });
productSchema.index({ colour: 1 });

export const Product = mongoose.models.Product ?? mongoose.model("Product", productSchema);
