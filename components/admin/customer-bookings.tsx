import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Booking } from "@/db/schema/bookings";

// Formats a booking time in the customer's business timezone (with the zone
// abbreviation), so it reads the same for every viewer/browser — a booking is
// only meaningful in the client's local time, not the viewer's.
function formatInZone(date: Date, timeZone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  };
  try {
    return date.toLocaleString("en-US", { ...opts, timeZone });
  } catch {
    // Fall back to the environment zone if the stored timezone is invalid.
    return date.toLocaleString("en-US", opts);
  }
}

export function CustomerBookings({
  bookings,
  timezone,
}: {
  bookings: Booking[];
  timezone: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming bookings</CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
        ) : (
          <div className="divide-y">
            {bookings.map((b) => (
              <div key={b.id} className="py-2 text-sm">
                <p className="font-medium">
                  {b.scheduledAt ? formatInZone(b.scheduledAt, timezone) : "Time TBD"}
                </p>
                {b.notes && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {b.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
