import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";

import { db } from "../db/drizzle";
import { bookings, calls, customers, vapiAgents } from "../db/schema";

config({ path: ".env" });

const HIGHTOWER_EMAIL = "ray@hightowerplumbing.com";

async function main(): Promise<void> {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set — cannot clean up");
    }

    const existing = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, HIGHTOWER_EMAIL));

    if (existing.length === 0) {
        console.log("Nothing to clean — no customer found for", HIGHTOWER_EMAIL);
        return;
    }

    const customerId = existing[0].id;
    console.log(`Cleaning Hightower demo data (customer ${customerId})`);

    const customerCalls = await db
        .select({ id: calls.id })
        .from(calls)
        .where(eq(calls.customerId, customerId));

    if (customerCalls.length > 0) {
        const callIds = customerCalls.map((c) => c.id);
        const deletedBookings = await db
            .delete(bookings)
            .where(inArray(bookings.callId, callIds))
            .returning({ id: bookings.id });
        console.log(`  - ${deletedBookings.length} bookings`);
    }

    const deletedCalls = await db
        .delete(calls)
        .where(eq(calls.customerId, customerId))
        .returning({ id: calls.id });
    console.log(`  - ${deletedCalls.length} calls`);

    const deletedAgents = await db
        .delete(vapiAgents)
        .where(eq(vapiAgents.customerId, customerId))
        .returning({ id: vapiAgents.id });
    console.log(`  - ${deletedAgents.length} vapi_agents`);

    const deletedCustomers = await db
        .delete(customers)
        .where(eq(customers.id, customerId))
        .returning({ id: customers.id });
    console.log(`  - ${deletedCustomers.length} customers`);

    console.log("Cleanup complete.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
