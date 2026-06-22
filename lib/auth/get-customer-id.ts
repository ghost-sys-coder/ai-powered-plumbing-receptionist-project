import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCustomerId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user] = await db
    .select({ customerId: users.customerId })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return user?.customerId ?? null;
}
