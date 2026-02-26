const FASHN_API = "https://api.fashn.ai/v1";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // ~2 min

export type FashnRunInputs = {
  product_image: string; // URL or base64
  prompt?: string;
  model_image?: string;
  image_prompt?: string;
  background_reference?: string;
  aspect_ratio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "2:3" | "3:2" | "4:5" | "5:4";
  resolution?: "1k" | "4k";
  num_images?: number; // 1-4
  output_format?: "png" | "jpeg";
  return_base64?: boolean;
};

export type FashnRunResponse = { id: string; error: string | null };
export type FashnStatusResponse = {
  id: string;
  status: "starting" | "in_queue" | "processing" | "completed" | "failed";
  output?: string[];
  error?: { name: string; message: string } | null;
};

export function isFashnConfigured(): boolean {
  return !!process.env.FASHN_API_KEY;
}

export async function fashnRun(inputs: FashnRunInputs): Promise<string> {
  const key = process.env.FASHN_API_KEY;
  if (!key) throw new Error("FASHN_API_KEY is not set");

  const res = await fetch(`${FASHN_API}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model_name: "product-to-model",
      inputs: {
        product_image: inputs.product_image,
        prompt: inputs.prompt ?? undefined,
        model_image: inputs.model_image,
        image_prompt: inputs.image_prompt,
        background_reference: inputs.background_reference,
        aspect_ratio: inputs.aspect_ratio ?? "3:4",
        resolution: inputs.resolution ?? "1k",
        num_images: Math.min(4, Math.max(1, inputs.num_images ?? 1)),
        output_format: inputs.output_format ?? "png",
        return_base64: inputs.return_base64 ?? false,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `FASHN run failed: ${res.status}`);
  }

  const data = (await res.json()) as FashnRunResponse;
  if (data.error) throw new Error(String(data.error));
  if (!data.id) throw new Error("FASHN did not return a prediction ID");
  return data.id;
}

export async function fashnStatus(id: string): Promise<FashnStatusResponse> {
  const key = process.env.FASHN_API_KEY;
  if (!key) throw new Error("FASHN_API_KEY is not set");

  const res = await fetch(`${FASHN_API}/status/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) throw new Error(`FASHN status failed: ${res.status}`);
  return (await res.json()) as FashnStatusResponse;
}

export async function fashnPollUntilComplete(id: string): Promise<string[]> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const status = await fashnStatus(id);
    if (status.status === "completed" && status.output?.length) {
      return status.output;
    }
    if (status.status === "failed") {
      const msg = status.error?.message ?? status.error?.name ?? "Generation failed";
      throw new Error(msg);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("FASHN generation timed out");
}
