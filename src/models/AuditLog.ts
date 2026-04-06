import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userEmail: String,
    targetType: String, // "user", "product", "order"
    targetId: String,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog ?? mongoose.model("AuditLog", auditLogSchema);
