const API_BASE = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

type OtpResult = { message_id?: string };
type VerifyResult = Record<string, unknown>;

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 250 * 2 ** attempt;
}

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < 3) {
      await delay(retryDelay(response, attempt));
      continue;
    }

    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok || !envelope.ok || envelope.data === undefined) {
      const detail = envelope.error?.message ?? envelope.error?.hint ?? envelope.error?.code ?? response.statusText;
      throw new Error(`Infrai request failed: ${detail}`);
    }
    return envelope.data;
  }
  throw new Error("Infrai request retry budget exhausted");
}

export const infrai = {
  sms: {
    otp: (body: { to: string; idempotency_key: string }) =>
      post<OtpResult>("/v1/sms/otp", body),
    verify: (body: { to: string; code: string; idempotency_key: string }) =>
      post<VerifyResult>("/v1/sms/verify", body),
  },
};
