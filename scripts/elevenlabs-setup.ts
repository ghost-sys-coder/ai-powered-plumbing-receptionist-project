/**
 * One-time ElevenLabs setup: creates the workspace post-call webhook that
 * every receptionist agent reports finished calls to, and saves its signing
 * secret to .env.local as ELEVENLABS_WEBHOOK_SECRET. ElevenLabs only returns
 * the secret at creation, so an existing webhook is left alone unless you
 * pass --recreate.
 *
 * Usage:
 *   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/elevenlabs-setup.ts https://your-domain
 *   ... --recreate   # replace the webhook (new secret)
 */
import { readFileSync, writeFileSync } from "fs";
import { elevenLabsApi } from "../lib/voice/elevenlabs/api";
import { POST_CALL_WEBHOOK_NAME } from "../lib/voice/elevenlabs/provider";

type WebhookList = { webhooks?: Array<{ webhook_id?: string; id?: string; name?: string; webhook_url?: string }> };

async function run() {
  const origin = process.argv[2]?.replace(/\/$/, "");
  if (!origin?.startsWith("https://")) throw new Error("Pass the site's https origin");
  const recreate = process.argv.includes("--recreate");
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  const api = elevenLabsApi(key);
  const url = `${origin}/api/webhooks/elevenlabs`;

  const list = (await api<WebhookList>("GET", "/v1/workspace/webhooks")).webhooks ?? [];
  const existing = list.find((w) => w.name === POST_CALL_WEBHOOK_NAME);
  if (existing && !recreate) {
    console.log(`webhook ${existing.webhook_id ?? existing.id} already exists (${existing.webhook_url}); pass --recreate for a new secret`);
    return;
  }
  if (existing) {
    await api("DELETE", `/v1/workspace/webhooks/${existing.webhook_id ?? existing.id}`);
    console.log("old webhook deleted");
  }

  const created = await api<{ webhook_id: string; webhook_secret?: string | null }>("POST", "/v1/workspace/webhooks", {
    settings: { auth_type: "hmac", name: POST_CALL_WEBHOOK_NAME, webhook_url: url },
  });
  if (!created.webhook_secret) throw new Error(`webhook ${created.webhook_id} created but no secret was returned`);

  const file = ".env.local";
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter((l) => !l.startsWith("ELEVENLABS_WEBHOOK_SECRET="));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  lines.push(`ELEVENLABS_WEBHOOK_SECRET=${created.webhook_secret}`, "");
  writeFileSync(file, lines.join("\n"));
  console.log(`webhook ${created.webhook_id} created for ${url}; signing secret saved to ${file}`);
}

run().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
