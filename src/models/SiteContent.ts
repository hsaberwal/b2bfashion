import mongoose from "mongoose";

/**
 * Stores editable site content (About page, etc.)
 * Uses a unique `key` field so there's only one document per content block.
 */
const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const SiteContent = mongoose.models.SiteContent ?? mongoose.model("SiteContent", siteContentSchema);
