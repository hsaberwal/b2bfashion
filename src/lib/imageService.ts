import { ImageServiceClient } from "railway-image-service/server";

const BLOB_KEY_PREFIX = "products/";

/** True if the app is configured to use Railway Image Service. */
export function isImageServiceConfigured(): boolean {
  return !!(process.env.IMAGE_SERVICE_URL && process.env.IMAGE_SERVICE_SECRET_KEY);
}

/** Lazy client; only created when Image Service is configured. */
export function getClient(): ImageServiceClient | null {
  const url = process.env.IMAGE_SERVICE_URL;
  const secretKey = process.env.IMAGE_SERVICE_SECRET_KEY;
  const signatureSecretKey = process.env.IMAGE_SERVICE_SIGNATURE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return new ImageServiceClient({
    url,
    secretKey,
    signatureSecretKey: signatureSecretKey ?? undefined,
  });
}

/**
 * Returns the blob storage key prefix used for product uploads.
 * Upload route should use keys like: products/{nanoid}.jpg
 */
export function getProductBlobKeyPrefix(): string {
  return BLOB_KEY_PREFIX;
}

/**
 * Check if an image value is a blob key (Image Service) rather than a full URL.
 * Blob keys don't start with http: or https: or /
 */
export function isBlobKey(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && !v.startsWith("http://") && !v.startsWith("https://") && !v.startsWith("/");
}

/**
 * Resolve image URLs for API responses.
 * - If value is a blob key (e.g. "products/abc.jpg"), returns a signed serve URL.
 * - Otherwise returns the value as-is (full URL or /api/uploads/...).
 * Size is the max width for the serve URL, e.g. 400 for list, 1200 for detail.
 */
export async function resolveImageUrl(value: string, sizePx: number = 800): Promise<string> {
  if (!isBlobKey(value)) return value;
  const client = getClient();
  if (!client) return value;
  try {
    const path = `serve/${sizePx}x/blob/${value}`;
    return await client.sign(path);
  } catch {
    return value;
  }
}

/**
 * Resolve an array of image values (mix of blob keys and URLs) to display URLs.
 */
export async function resolveImageUrls(values: string[], sizePx: number = 800): Promise<string[]> {
  if (!values?.length) return [];
  const client = getClient();
  if (!client) return values;

  const out: string[] = [];
  for (const v of values) {
    if (!isBlobKey(v)) {
      out.push(v);
      continue;
    }
    try {
      const path = `serve/${sizePx}x/blob/${v}`;
      out.push(await client.sign(path));
    } catch {
      out.push(v);
    }
  }
  return out;
}
