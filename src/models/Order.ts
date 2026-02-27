import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  pricePerItem: Number,
  packSize: { type: Number, min: 1 },
  size: { type: String, default: undefined },
});

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ["pending", "signed", "confirmed", "cancelled"],
      default: "pending",
    },
    signatureDataUrl: String,
    signedAt: Date,
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.models.Order ?? mongoose.model("Order", orderSchema);
