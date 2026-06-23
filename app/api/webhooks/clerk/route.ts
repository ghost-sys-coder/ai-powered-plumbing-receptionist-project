import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import {
  syncClerkUserCreated,
  syncClerkUserUpdated,
  softDeleteClerkUser,
  type ClerkUserPayload,
} from "@/lib/services/users";

type ClerkWebhookEvent =
  | { type: "user.created"; data: ClerkUserPayload }
  | { type: "user.updated"; data: ClerkUserPayload }
  | { type: "user.deleted"; data: { id: string; deleted?: boolean } }
  | { type: string; data: unknown };

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();

  let event: ClerkWebhookEvent;
  try {
    event = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`[clerk-webhook] received ${event.type}`);

  try {
    switch (event.type) {
      case "user.created": {
        const data = event.data as ClerkUserPayload;
        let meta = data.public_metadata;

        // Clerk sometimes delays metadata propagation — fetch user directly as fallback
        if (!meta?.customer_id) {
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(data.id);
          meta = clerkUser.publicMetadata as { role?: string; customer_id?: string };
        }

        const customerId = meta?.customer_id ?? null;
        const role = meta?.role === "admin" ? "admin" : "client";

        await syncClerkUserCreated(data, customerId, role);
        break;
      }
      case "user.updated":
        await syncClerkUserUpdated(event.data as ClerkUserPayload);
        break;
      case "user.deleted": {
        const { id } = event.data as { id: string };
        if (!id) {
          return new Response("Missing user id", { status: 400 });
        }
        await softDeleteClerkUser(id);
        break;
      }
      default:
        console.log(`[clerk-webhook] ignoring event ${event.type}`);
    }
  } catch (err) {
    console.error(`[clerk-webhook] handler failed for ${event.type}`, err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
