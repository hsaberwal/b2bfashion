import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { z } from "zod";

const deliverySchema = z.object({
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().min(1, "Country is required"),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  vatNumber: z.string().optional(),
  deliveryAddress: deliverySchema.optional(),
});

/** GET /api/user/profile — current user profile (delivery, VAT, company). */
export async function GET() {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await User.findById(session.userId).select(
      "email name companyName deliveryAddress vatNumber"
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      deliveryAddress: user.deliveryAddress ?? undefined,
      vatNumber: user.vatNumber ?? undefined,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

/** PATCH /api/user/profile — update profile (name, companyName, vatNumber, deliveryAddress). */
export async function PATCH(request: NextRequest) {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    if (parsed.data.name !== undefined) user.name = parsed.data.name;
    if (parsed.data.companyName !== undefined) user.companyName = parsed.data.companyName;
    if (parsed.data.vatNumber !== undefined) user.vatNumber = parsed.data.vatNumber || undefined;
    if (parsed.data.deliveryAddress !== undefined) {
      user.deliveryAddress = {
        addressLine1: parsed.data.deliveryAddress.addressLine1,
        addressLine2: parsed.data.deliveryAddress.addressLine2 ?? "",
        city: parsed.data.deliveryAddress.city,
        postcode: parsed.data.deliveryAddress.postcode,
        country: parsed.data.deliveryAddress.country,
      };
    }
    await user.save();
    return NextResponse.json({
      name: user.name,
      companyName: user.companyName,
      deliveryAddress: user.deliveryAddress,
      vatNumber: user.vatNumber,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
