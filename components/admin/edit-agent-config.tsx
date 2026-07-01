"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Props = {
  customerId: string;
  calendarType: "google_calendar" | "manual";
  calendarId: string | null;
  appointmentDurationMinutes: number;
  appointmentBufferMinutes: number;
};

export function EditAgentConfig({
  customerId,
  calendarType: initialType,
  calendarId: initialCalendarId,
  appointmentDurationMinutes,
  appointmentBufferMinutes,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calendarType, setCalendarType] = useState<"google_calendar" | "manual">(initialType);
  const [calendarId, setCalendarId] = useState(initialCalendarId ?? "");
  const [duration, setDuration] = useState(String(appointmentDurationMinutes));
  const [buffer, setBuffer] = useState(String(appointmentBufferMinutes));

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarType,
          calendarId,
          appointmentDurationMinutes: Number(duration),
          appointmentBufferMinutes: Number(buffer),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      setOpen(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-3.5 w-3.5" />
          Edit agent config
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Agent booking config</SheetTitle>
          <SheetDescription>
            Changes re-sync the AI assistant&apos;s prompt and calendar tools.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <div className="space-y-1.5">
            <Label htmlFor="calendarType">Calendar integration</Label>
            <Select
              value={calendarType}
              onValueChange={(v) => setCalendarType(v as "google_calendar" | "manual")}
            >
              <SelectTrigger id="calendarType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_calendar">Google Calendar (direct booking)</SelectItem>
                <SelectItem value="manual">Manual scheduling (AI takes messages)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {calendarType === "google_calendar" && (
            <div className="space-y-1.5">
              <Label htmlFor="calendarId">Calendar ID</Label>
              <Input
                id="calendarId"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="abc123@group.calendar.google.com"
              />
              <p className="text-xs text-muted-foreground">
                Share the calendar with the service account, then paste its Calendar ID.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="duration">Appointment duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={30}
              max={480}
              step={30}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              How long to block on the calendar per booking.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="buffer">Buffer time between appointments (minutes)</Label>
            <Input
              id="buffer"
              type="number"
              min={0}
              max={120}
              step={15}
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Travel/prep time between jobs.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" disabled={saving}>
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
