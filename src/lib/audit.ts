/**
 * Audit logging for security-sensitive actions.
 * Logs are stored in MongoDB for forensic investigation.
 */

import { connectDB } from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";

export type AuditAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "register"
  | "otp_sent"
  | "otp_verified"
  | "otp_failed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "role_changed"
  | "user_approved"
  | "user_updated"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "order_signed"
  | "payment_initiated"
  | "payment_completed"
  | "payment_failed"
  | "admin_action";

export async function audit(params: {
  action: AuditAction;
  userId?: string;
  userEmail?: string;
  targetType?: "user" | "product" | "order";
  targetId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      action: params.action,
      userId: params.userId,
      userEmail: params.userEmail,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details,
      ip: params.ip,
    });
  } catch (e) {
    // Never let audit logging failures break the application
    console.error("Audit log failed:", e);
  }
}
