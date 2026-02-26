import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  companyName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password, name, companyName } = parsed.data;
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      name,
      companyName,
      pricingApproved: false,
    });
    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      role: user.role ?? "customer",
      pricingApproved: user.pricingApproved,
      canViewForwardStock: user.canViewForwardStock ?? user.role === "admin",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Registration failed";
    console.error("Registration error:", e);
    const isDev = process.env.NODE_ENV === "development";
    const isDbError =
      message.includes("MONGODB") ||
      message.includes("MONGO") ||
      message.includes("connect") ||
      message.includes("ECONNREFUSED");
    const userMessage = isDev
      ? message
      : isDbError
        ? "Registration failed. Database is not available — check that MongoDB is running and MONGODB_URI (or MONGO_URL) is set."
        : "Registration failed. Please try again.";
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
