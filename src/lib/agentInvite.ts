import { nanoid } from "nanoid";
import { Resend } from "resend";

/**
 * Invite helpers for agents and agent-created customers. An invite reuses the
 * existing password-reset machinery: we set a `resetToken` + expiry on the user
 * and email them the `/reset-password?token=` link, so they set their own
 * password via the existing reset-password page + confirm route.
 */

export const INVITE_EXPIRY_DAYS = 7;

/** A setup token + expiry (7 days — longer than the 1h password-reset window). */
export function makeInviteToken(): { token: string; expires: Date } {
  const token = nanoid(32);
  const expires = new Date();
  expires.setDate(expires.getDate() + INVITE_EXPIRY_DAYS);
  return { token, expires };
}

export function inviteLink(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/reset-password?token=${token}`;
}

function emailConfigured(): { from: string; apiKey: string } | null {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return null;
  return { from, apiKey };
}

function shell(heading: string, bodyHtml: string, link: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px;">
      <h2 style="margin: 0 0 12px;">${heading}</h2>
      ${bodyHtml}
      <div style="margin: 24px 0;">
        <a href="${link}" style="background:#111;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
          Set up your account
        </a>
      </div>
      <p style="color:#666;font-size:13px;">Or paste this link: <code>${link}</code></p>
      <p style="color:#666;font-size:13px;">This link expires in ${INVITE_EXPIRY_DAYS} days.</p>
      <p style="color:#888;font-size:12px;margin-top:24px;">Claudia.C · 32-34 Sampson Road North, B11 1BL</p>
    </div>
  `;
}

/** Email an invited agent a link to set their password and access the agent portal. */
export async function sendAgentInviteEmail(data: { to: string; name?: string; link: string }): Promise<void> {
  const cfg = emailConfigured();
  if (!cfg) {
    if (process.env.NODE_ENV === "development") console.log("[agent invite link]", data.to, data.link);
    return;
  }
  const greeting = data.name ? `Hi ${data.name},` : "Hello,";
  const html = shell(
    "You've been invited as a Claudia.C agent",
    `<p style="color:#555;">${greeting}</p>
     <p style="color:#555;">You've been set up as a sales agent on Claudia.C B2B. Set your password to log in,
     manage your customers, and place orders on their behalf.</p>`,
    data.link,
  );
  try {
    await new Resend(cfg.apiKey).emails.send({ from: cfg.from, to: data.to, subject: "Set up your Claudia.C agent account", html });
  } catch (err) {
    console.error("[agent invite email] send failed:", err);
  }
}

/** Email a customer (invited by their agent) a link to set their password and register. */
export async function sendCustomerInviteEmail(data: { to: string; agentName?: string; link: string }): Promise<void> {
  const cfg = emailConfigured();
  if (!cfg) {
    if (process.env.NODE_ENV === "development") console.log("[customer invite link]", data.to, data.link);
    return;
  }
  const by = data.agentName ? ` by ${data.agentName}` : "";
  const html = shell(
    "You've been invited to Claudia.C B2B",
    `<p style="color:#555;">Hello,</p>
     <p style="color:#555;">You've been invited${by} to set up a wholesale account with Claudia.C B2B.
     Set your password to log in and view your orders.</p>`,
    data.link,
  );
  try {
    await new Resend(cfg.apiKey).emails.send({ from: cfg.from, to: data.to, subject: "Set up your Claudia.C wholesale account", html });
  } catch (err) {
    console.error("[customer invite email] send failed:", err);
  }
}
