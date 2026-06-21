import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type Metadata = { role?: "admin" | "client" } | undefined;

export async function requireAdmin() {
  const { sessionClaims, userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const metadata = sessionClaims?.metadata as Metadata;
  if (metadata?.role !== "admin") {
    redirect("/dashboard");
  }

  return sessionClaims;
}
