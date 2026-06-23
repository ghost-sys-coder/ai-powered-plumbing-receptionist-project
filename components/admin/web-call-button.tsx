"use client";

import { Button } from "@/components/ui/button";
import { useVapiCall } from "@/lib/hooks/use-vapi-call";
import { PhoneCall } from "lucide-react";

export function WebCallButton({
  customerId,
  disabled = false,
}: {
  customerId: string;
  disabled?: boolean;
}) {
  const { callState, isMuted, errorMessage, startCall, endCall, toggleMute } =
    useVapiCall(customerId);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Primary call button */}
        <div className={callState === "active" ? "animate-call-pulse rounded-md" : ""}>
          {callState === "idle" && (
            <Button
              onClick={startCall}
              disabled={disabled}
              size="lg"
              className="gap-3 bg-green-600 px-8 text-base font-semibold text-white shadow-lg shadow-green-600/30 hover:bg-green-500 hover:shadow-green-500/40 dark:bg-green-600 dark:hover:bg-green-500"
            >
              <PhoneCall className="h-5 w-5" />
              Test Agent
            </Button>
          )}
          {(callState === "requesting" || callState === "connecting") && (
            <Button variant="ghost" disabled>
              {callState === "requesting" ? "Connecting..." : "Starting call..."}
            </Button>
          )}
          {callState === "active" && (
            <Button variant="destructive" onClick={endCall}>
              End call
            </Button>
          )}
          {callState === "ending" && (
            <Button variant="ghost" disabled>
              Ending...
            </Button>
          )}
          {callState === "ended" && (
            <Button variant="outline" disabled className="text-muted-foreground">
              Call ended
            </Button>
          )}
          {callState === "error" && (
            <Button variant="outline" onClick={startCall}>
              Retry
            </Button>
          )}
        </div>

        {/* Mute toggle — only when active */}
        {callState === "active" && (
          <Button variant="outline" size="sm" onClick={toggleMute}>
            {isMuted ? "Unmute" : "Mute"}
          </Button>
        )}
      </div>

      {callState === "error" && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
