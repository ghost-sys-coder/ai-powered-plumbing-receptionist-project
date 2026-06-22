import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { bookings } from "@/db/schema";

export type CreateBookingFromCallInput = {
    callId: string;
    customerId: string;
    bookingTime: string | null;
    notes?: string | null;
};

function parseBookingTime(value: string | null): { scheduledAt: Date | null; raw: string | null } {
    if (!value) return { scheduledAt: null, raw: null };
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
        return { scheduledAt: d, raw: null };
    }
    return { scheduledAt: null, raw: value };
}

export async function createBookingFromCall(
    input: CreateBookingFromCallInput
): Promise<void> {
    const existing = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.callId, input.callId))
        .limit(1);

    if (existing.length > 0) {
        console.log(`[createBookingFromCall] booking already exists for call ${input.callId}`);
        return;
    }

    const { scheduledAt, raw } = parseBookingTime(input.bookingTime);

    const notes =
        input.notes ??
        (scheduledAt
            ? null
            : raw
              ? `Caller indicated: "${raw}" — confirm exact time with customer`
              : "Booking time not captured — confirm with customer");

    try {
        await db.insert(bookings).values({
            callId: input.callId,
            customerId: input.customerId,
            scheduledAt,
            notes,
        });
    } catch (err) {
        throw new Error(
            `createBookingFromCall failed for call ${input.callId}: ${(err as Error).message}`
        );
    }
}
