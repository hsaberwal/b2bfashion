import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: String,
    companyName: String,
    deliveryAddress: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      postcode: String,
      country: String,
    },
    vatNumber: String,
    applicationMessage: String,
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    pricingApproved: { type: Boolean, default: false },
    canViewForwardStock: { type: Boolean, default: false },
    canViewCurrentStock: { type: Boolean, default: true },
    canViewPreviousStock: { type: Boolean, default: true },
    otpCode: String,
    otpExpires: Date,
    resetToken: String,
    resetTokenExpires: Date,
  },
  { timestamps: true }
);

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
