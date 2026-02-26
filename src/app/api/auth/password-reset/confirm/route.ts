import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { token, newPassword } = parsed.data;
    await connectDB();
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }
    const passwordHash = await hashPassword(newPassword);
    await User.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash },
        $unset: { resetToken: 1, resetTokenExpires: 1 },
      }
    );
    return NextResponse.json({ ok: true, message: "Password updated" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
