import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  pricePerPiece: Number,
  packSize: { type: Number, min: 1 },
  size: { type: String, default: undefined },

  // --- Partial cancellation (a pack removed from an otherwise live order) ---
  cancelled: { type: Boolean, default: false },
  cancelledAt: Date,
  cancelledReason: String,
  /** Value credited back to the customer for this removed line (capped at what they'd paid). */
  creditAmount: { type: Number, default: 0 },
  /** How the credit is settled: added to the customer's account balance, or owed as a refund. */
  creditType: { type: String, enum: ["balance", "refund"], default: undefined },
  /** For creditType "refund": "owed" until the Stripe refund is issued, then "refunded". */
  refundStatus: { type: String, enum: ["none", "owed", "refunded"], default: "none" },
  stripeRefundId: String,
});

const deliverySnapshotSchema = new mongoose.Schema(
  {
    addressLine1: String,
    addressLine2: String,
    city: String,
    postcode: String,
    country: String,
    vatNumber: String,
    companyName: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: [
        "pending",        // open cart, not yet signed
        "signed",         // signed, awaiting payment / acceptance on credit
        "confirmed",      // paid (in full or deposit) or accepted on credit
        "picked",         // admin has pulled the items
        "ready_to_ship",  // packed and waiting on the courier
        "shipped",        // handed to courier
        "delivered",      // arrived with the customer
        "cancelled",
      ],
      default: "pending",
    },
    pickedAt: Date,
    readyAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    shippingCarrier: String,
    shippingTrackingNumber: String,
    signatureDataUrl: String,
    signedAt: Date,
    /** Free-text instructions from the customer at checkout (shown on the PDF + pick list). */
    specialInstructions: { type: String, maxlength: 2000, default: "" },
    deliverySnapshot: deliverySnapshotSchema,
    paymentOption: { type: String, enum: ["pay_now", "pay_deposit", "pay_later"], default: "pay_later" },
    depositAmount: Number,
    depositPaid: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ["none", "pending", "paid", "failed", "refunded"],
      default: "none",
    },
    amountPaid: Number,
    /** Total value refunded to the customer via Stripe across partial cancellations. */
    refundedTotal: { type: Number, default: 0 },
    stripeSessionId: String,
    stripePaymentIntentId: String,
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.models.Order ?? mongoose.model("Order", orderSchema);
