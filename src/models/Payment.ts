import mongoose from "mongoose";

/**
 * A payment recorded against an order. Includes:
 *   - automatic Stripe captures (created from the webhook, method="stripe")
 *   - manual payments admins record after a customer pays by cash, bank
 *     transfer, cheque, or any other channel
 *
 * Sum of payments for an order is the source of truth for "amount paid".
 * Outstanding = order total - sum(payments where !refunded).
 */
const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "GBP" },
    method: {
      type: String,
      required: true,
      enum: ["stripe", "cash", "bank_transfer", "cheque", "other"],
    },
    reference: String,
    note: String,
    stripePaymentIntentId: String,
    refunded: { type: Boolean, default: false },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Payment = mongoose.models.Payment ?? mongoose.model("Payment", paymentSchema);
