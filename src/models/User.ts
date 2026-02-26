import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: String,
    companyName: String,
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    pricingApproved: { type: Boolean, default: false },
    otpCode: String,
    otpExpires: Date,
    resetToken: String,
    resetTokenExpires: Date,
  },
  { timestamps: true }
);

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
