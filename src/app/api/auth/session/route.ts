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
      "email name companyName role pricingApproved canViewForwardStock"
    );
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role ?? "customer",
        pricingApproved: user.pricingApproved,
        canViewForwardStock: user.role === "admin" ? true : (user.canViewForwardStock ?? false),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ user: null });
  }
}
