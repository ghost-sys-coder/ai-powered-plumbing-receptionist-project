import crypto from "node:crypto";

// Verifies Vapi's HMAC-SHA256 signature over the raw request body. Shared by the
// event webhook and the tool endpoints.
export function verifyVapiSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

// Returns null if the request is authorised, or a Response to return if not.
// Respects SKIP_VAPI_SIGNATURE_VERIFY=true for local dev.
export function checkVapiSignature(request: Request, rawBody: string): Response | null {
  if (process.env.SKIP_VAPI_SIGNATURE_VERIFY === "true") return null;

  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[vapi] VAPI_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = request.headers.get("x-vapi-signature");
  if (!verifyVapiSignature(rawBody, signature, secret)) {
    console.warn("[vapi] signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  return null;
}
