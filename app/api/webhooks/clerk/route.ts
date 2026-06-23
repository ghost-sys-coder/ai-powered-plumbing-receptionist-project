import { Webhook } from "svix";
import { db } from "@/db/drizzle";
import { pendingInvites } from "@/db/schema";
import { eq } from "drizzle-orm";
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

function primaryEmail(payload: ClerkUserPayload): string | null {
  const primary = payload.email_addresses.find(
    (e) => e.id === payload.primary_email_address_id
  );
  return primary?.email_address ?? payload.email_addresses[0]?.email_address ?? null;
}

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
        const email = primaryEmail(data);

        let customerId: string | null = null;
        let role: "admin" | "client" = "client";

        if (email) {
          // Look up our own pending_invites table — reliable, no Clerk metadata timing issues
          const [invite] = await db
            .select({ customerId: pendingInvites.customerId })
            .from(pendingInvites)
            .where(eq(pendingInvites.email, email))
            .limit(1);

          if (invite) {
            customerId = invite.customerId;
            role = "client";
            // Clean up — invite is consumed
            await db.delete(pendingInvites).where(eq(pendingInvites.email, email));
          }
        }

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
