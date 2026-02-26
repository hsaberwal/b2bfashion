import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ token: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session =
  mongoose.models.Session ?? mongoose.model("Session", sessionSchema);
