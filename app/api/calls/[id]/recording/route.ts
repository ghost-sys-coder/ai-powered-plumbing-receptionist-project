import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { calls, users } from "@/db/schema";
import { getSignedRecordingUrl } from "@/lib/vapi/recording-url";

type RoleClaims = { role?: "admin" | "client" } | undefined;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Streams a call recording to the portal's <audio> player by redirecting to a
// fresh signed URL from Vapi. Clients may only play their own business's calls;
// admins may play any. The Vapi private key never reaches the browser.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return new Response("Not found", { status: 404 });

  const [call] = await db
    .select({ vapiCallId: calls.vapiCallId, customerId: calls.customerId, audioUrl: calls.audioUrl })
    .from(calls)
    .where(eq(calls.id, id))
    .limit(1);
  if (!call?.audioUrl) return new Response("Not found", { status: 404 });

  const isAdmin = (sessionClaims?.metadata as RoleClaims)?.role === "admin";
  if (!isAdmin) {
    const [user] = await db
      .select({ customerId: users.customerId })
      .from(users)
      .where(and(eq(users.clerkId, userId), isNull(users.deletedAt)))
      .limit(1);
    // 404 rather than 403 so call ids from other businesses aren't confirmed.
    if (!user?.customerId || user.customerId !== call.customerId) {
      return new Response("Not found", { status: 404 });
    }
  }

  const signedUrl = await getSignedRecordingUrl(call.vapiCallId);
  if (!signedUrl) return new Response("Recording unavailable", { status: 502 });

  return new Response(null, {
    status: 302,
    headers: { Location: signedUrl, "Cache-Control": "private, no-store" },
  });
}
