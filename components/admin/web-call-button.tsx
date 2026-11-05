"use client";

import { Button } from "@/components/ui/button";
import { useVapiCall } from "@/lib/hooks/use-vapi-call";
import { CallPopup } from "@/components/admin/call-popup";
import { PhoneCall } from "lucide-react";

export function WebCallButton({
  customerId,
  disabled = false,
}: {
  customerId: string;
  disabled?: boolean;
}) {
  const {
    callState,
    isMuted,
    errorMessage,
    activeSpeaker,
    startCall,
    endCall,
    toggleMute,
    reset,
  } = useVapiCall(customerId);

  return (
    <div className="space-y-2">
      <Button
        onClick={startCall}
        disabled={disabled || callState !== "idle"}
        size="lg"
        className="gap-2.5 px-5"
      >
        <PhoneCall className="size-4" />
        Start test call
      </Button>

      {/* Live call popup with speaking indicators */}
      <CallPopup
        callState={callState}
        activeSpeaker={activeSpeaker}
        isMuted={isMuted}
        errorMessage={errorMessage}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onClose={reset}
      />
    </div>
  );
}
