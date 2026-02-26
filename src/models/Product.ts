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
    sizes: [String],
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },
    packSize: { type: Number, required: true, min: 1 },
    pricePerItem: Number,
    compareAtPrice: Number,
    createdAt: Date,
    updatedAt: Date,
  },
  { timestamps: true }
);

productSchema.index({ stockCategory: 1 });
productSchema.index({ category: 1 });
productSchema.index({ colour: 1 });

export const Product = mongoose.models.Product ?? mongoose.model("Product", productSchema);
