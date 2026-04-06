/**
 * Worldpay (FIS/Global Payments) — Hosted Payment Page integration.
 *
 * Uses Worldpay's XML redirect flow:
 * 1. Build an XML order request
 * 2. POST it to Worldpay's XML gateway
 * 3. Extract the redirect URL from the response
 * 4. Customer pays on Worldpay's hosted page
 * 5. Worldpay redirects back to our success/failure/pending URLs
 */

const WORLDPAY_TEST_URL = "https://secure-test.worldpay.com/jsp/merchant/xml/paymentService.jsp";
const WORLDPAY_LIVE_URL = "https://secure.worldpay.com/jsp/merchant/xml/paymentService.jsp";

export function isWorldpayConfigured(): boolean {
  return !!(
    process.env.WORLDPAY_MERCHANT_CODE &&
    process.env.WORLDPAY_XML_PASSWORD
  );
}

function getGatewayUrl(): string {
  return process.env.WORLDPAY_ENV === "live" ? WORLDPAY_LIVE_URL : WORLDPAY_TEST_URL;
}

function getCredentials() {
  const merchantCode = process.env.WORLDPAY_MERCHANT_CODE!;
  const xmlPassword = process.env.WORLDPAY_XML_PASSWORD!;
  return { merchantCode, xmlPassword };
}

export type WorldpayOrderParams = {
  orderCode: string;
  description: string;
  amount: number; // in GBP (e.g. 29.99)
  currencyCode?: string;
  shopperEmail: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  cancelUrl: string;
};

/**
 * Build the XML order request for Worldpay's hosted payment page.
 */
function buildOrderXml(params: WorldpayOrderParams): string {
  const { merchantCode } = getCredentials();
  const currency = params.currencyCode ?? "GBP";
  // Worldpay expects amount in minor units (pence for GBP)
  const amountInMinor = Math.round(params.amount * 100);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE paymentService PUBLIC "-//WorldPay//DTD WorldPay PaymentService v1//EN"
  "http://dtd.worldpay.com/paymentService_v1.dtd">
<paymentService version="1.4" merchantCode="${escapeXml(merchantCode)}">
  <submit>
    <order orderCode="${escapeXml(params.orderCode)}">
      <description>${escapeXml(params.description)}</description>
      <amount currencyCode="${escapeXml(currency)}" exponent="2" value="${amountInMinor}" />
      <orderContent><![CDATA[Claudia B2B Wholesale Order]]></orderContent>
      <paymentMethodMask>
        <include code="ALL" />
      </paymentMethodMask>
      <shopper>
        <shopperEmailAddress>${escapeXml(params.shopperEmail)}</shopperEmailAddress>
      </shopper>
    </order>
  </submit>
</paymentService>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Submit an order to Worldpay and get back the redirect URL
 * for the hosted payment page.
 */
export async function createWorldpayOrder(params: WorldpayOrderParams): Promise<string> {
  const { merchantCode, xmlPassword } = getCredentials();
  const xml = buildOrderXml(params);
  const authHeader = "Basic " + Buffer.from(`${merchantCode}:${xmlPassword}`).toString("base64");

  const res = await fetch(getGatewayUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      Authorization: authHeader,
    },
    body: xml,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worldpay request failed (${res.status}): ${text}`);
  }

  const responseXml = await res.text();

  // Extract redirect URL from the response
  const refMatch = responseXml.match(/<reference[^>]*>(https?:\/\/[^<]+)<\/reference>/);
  if (refMatch) {
    let redirectUrl = refMatch[1];
    // Validate the redirect URL belongs to Worldpay
    const redirectHost = new URL(redirectUrl).hostname;
    if (!redirectHost.endsWith(".worldpay.com") && !redirectHost.endsWith(".wp.com")) {
      throw new Error("Worldpay returned an unexpected redirect domain");
    }
    // Append success/failure/pending/cancel URLs
    redirectUrl += `&successURL=${encodeURIComponent(params.successUrl)}`;
    redirectUrl += `&failureURL=${encodeURIComponent(params.failureUrl)}`;
    redirectUrl += `&pendingURL=${encodeURIComponent(params.pendingUrl)}`;
    redirectUrl += `&cancelURL=${encodeURIComponent(params.cancelUrl)}`;
    return redirectUrl;
  }

  // Check for errors
  const errorMatch = responseXml.match(/<error[^>]*code="([^"]*)"[^>]*>([^<]*)<\/error>/);
  if (errorMatch) {
    throw new Error(`Worldpay error (${errorMatch[1]}): ${errorMatch[2]}`);
  }

  throw new Error("Could not extract redirect URL from Worldpay response");
}

/**
 * Verify a Worldpay order notification MAC (optional, for webhook security).
 */
export async function verifyWorldpayMac(
  orderKey: string,
  paymentAmount: string,
  paymentCurrency: string,
  paymentStatus: string,
  receivedMac: string
): Promise<boolean> {
  const macSecret = process.env.WORLDPAY_MAC_SECRET;
  if (!macSecret) return true; // Skip MAC check if not configured

  const crypto = await import("crypto");
  const macInput = `${orderKey}${paymentAmount}${paymentCurrency}${paymentStatus}${macSecret}`;
  const expectedMac = crypto.createHash("md5").update(macInput).digest("hex");
  return expectedMac === receivedMac;
}
