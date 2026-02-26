import mongoose from "mongoose";
import { PRODUCT_CATEGORIES } from "@/lib/types";

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    barcode: String,
    styleNumber: String,
    name: { type: String, required: true },
    description: String,
    category: { type: String, required: true, enum: PRODUCT_CATEGORIES },
    stockCategory: {
      type: String,
      required: true,
      enum: ["previous", "current", "forward"],
    },
    colour: { type: String, required: true },
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    images: { type: [String], default: [] },
    packSize: { type: Number, required: true, min: 1 },
    pricePerItem: Number,
    createdAt: Date,
    updatedAt: Date,
  },
  { timestamps: true }
);

productSchema.index({ sku: 1 });
productSchema.index({ stockCategory: 1 });
productSchema.index({ category: 1 });
productSchema.index({ colour: 1 });

export const Product = mongoose.models.Product ?? mongoose.model("Product", productSchema);
