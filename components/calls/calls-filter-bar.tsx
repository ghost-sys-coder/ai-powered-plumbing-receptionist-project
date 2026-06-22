"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CallsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={searchParams.get("outcome") ?? "all"}
        onValueChange={(v) => update("outcome", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Outcome" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All outcomes</SelectItem>
          <SelectItem value="booked">Booked</SelectItem>
          <SelectItem value="message_taken">Message</SelectItem>
          <SelectItem value="dropped">Dropped</SelectItem>
          <SelectItem value="abandoned">Abandoned</SelectItem>
          <SelectItem value="transferred">Transferred</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("urgency") ?? "all"}
        onValueChange={(v) => update("urgency", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Urgency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All urgency</SelectItem>
          <SelectItem value="emergency">Emergency</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="routine">Routine</SelectItem>
          <SelectItem value="unknown">Unknown</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("dateRange") ?? "all"}
        onValueChange={(v) => update("dateRange", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="week">This week</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
