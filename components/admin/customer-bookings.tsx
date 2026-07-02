import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                  {b.scheduledAt ? formatDateTimeShort(b.scheduledAt, timezone) : "Time TBD"}
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
