import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { getStoredRecipients, setStoredRecipients } from "@/lib/notificationRecipients";

export const runtime = "nodejs";

const putSchema = z.object({
  emails: z.array(z.string()).max(50),
});

/** GET /api/admin/notification-recipients — the DB-managed new-order alert list. */
export async function GET() {
  try {
    await requireAdmin();
    const emails = await getStoredRecipients();
    return NextResponse.json({ emails });
  } catch (e) {
    return errorResponse(e);
  }
}

/** PUT /api/admin/notification-recipients — replace the recipient list. */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const emails = await setStoredRecipients(parsed.data.emails);
    return NextResponse.json({ emails });
  } catch (e) {
    return errorResponse(e);
  }
}

function errorResponse(e: unknown) {
  const err = e as Error & { status?: number };
  if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  console.error("notification-recipients error:", e);
  return NextResponse.json({ error: "Failed" }, { status: 500 });
}
