import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyNote, SectionHeader } from "@/components/layout/section-header";
import type { Booking } from "@/db/schema/bookings";
import { formatDateTimeShort } from "@/lib/format-time";

export function CustomerBookings({
  bookings,
  timezone,
}: {
  bookings: Booking[];
  timezone: string;
}) {
  return (
    <Card>
      <SectionHeader icon={CalendarClock} title="Upcoming bookings" description="Appointments the receptionist made" />
      <div className="px-5">
        {bookings.length === 0 ? (
          <EmptyNote>Nothing booked yet.</EmptyNote>
        ) : (
          <ul className="divide-y divide-border/60">
            {bookings.map((b) => (
              <li key={b.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/70 ring-4 ring-primary/10" />
                <div className="min-w-0">
                  <p className="tabular font-medium">
                    {b.scheduledAt ? formatDateTimeShort(b.scheduledAt, timezone) : "Time to be confirmed"}
                  </p>
                  {b.notes && <p className="mt-0.5 truncate text-xs text-muted-foreground">{b.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
