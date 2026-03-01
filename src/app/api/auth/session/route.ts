import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";
import { User } from "@/models/User";

export async function GET() {
  try {
    const token = await getSessionToken();
    if (!token) {
      return NextResponse.json({ user: null });
    }
    await connectDB();
    const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!session) {
      return NextResponse.json({ user: null });
    }
    const user = await User.findById(session.userId).select(
      "email name companyName deliveryAddress vatNumber role pricingApproved canViewForwardStock canViewCurrentStock canViewPreviousStock"
    );
    if (!user) {
      return NextResponse.json({ user: null });
    }
    const isAdmin = user.role === "admin";
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        deliveryAddress: user.deliveryAddress,
        vatNumber: user.vatNumber,
        role: user.role ?? "customer",
        pricingApproved: user.pricingApproved,
        canViewForwardStock: isAdmin ? true : (user.canViewForwardStock ?? false),
        canViewCurrentStock: isAdmin ? true : (user.canViewCurrentStock ?? true),
        canViewPreviousStock: isAdmin ? true : (user.canViewPreviousStock ?? true),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ user: null });
  }
}
