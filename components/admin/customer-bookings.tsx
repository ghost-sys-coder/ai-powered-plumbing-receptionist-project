import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Booking } from "@/db/schema/bookings";

export function CustomerBookings({ bookings }: { bookings: Booking[] }) {
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
                  {b.scheduledAt
                    ? b.scheduledAt.toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "Time TBD"}
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
