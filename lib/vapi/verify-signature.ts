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
  return safeEqual(provided, expected);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// A request is authentic if it carries the shared secret in X-Vapi-Secret (sent
// by the tools' server headers and by the org webhook's Bearer credential with
// that header name), or a valid HMAC in x-vapi-signature.
function isAuthentic(request: Request, rawBody: string, secret: string): boolean {
  const header = request.headers.get("x-vapi-secret");
  if (header && safeEqual(header, secret)) return true;
  return verifyVapiSignature(rawBody, request.headers.get("x-vapi-signature"), secret);
}

// Returns null if the request is authorised, or a Response to return if not.
// SKIP_VAPI_SIGNATURE_VERIFY=true bypasses enforcement (local dev, or while
// rolling the secret out) but still logs whether the request would have passed,
// so enforcement can be switched on only once real traffic is verified.
export function checkVapiSignature(request: Request, rawBody: string): Response | null {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  const path = new URL(request.url).pathname;

  if (process.env.SKIP_VAPI_SIGNATURE_VERIFY === "true") {
    const verdict = secret ? (isAuthentic(request, rawBody, secret) ? "PASS" : "FAIL") : "no secret set";
    console.log(`[vapi-auth] ${path}: would ${verdict} (enforcement off)`);
    return null;
  }

  if (!secret) {
    console.error("[vapi] VAPI_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  if (!isAuthentic(request, rawBody, secret)) {
    console.warn(`[vapi-auth] ${path}: rejected — missing or invalid secret`);
    return new Response("Invalid signature", { status: 401 });
  }

  return null;
}
