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
      pricingApproved: user.pricingApproved,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
