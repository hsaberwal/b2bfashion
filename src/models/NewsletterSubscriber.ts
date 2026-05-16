import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    source: { type: String, default: "footer" },
    ipAddress: String,
    unsubscribed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const NewsletterSubscriber =
  mongoose.models.NewsletterSubscriber ?? mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);
