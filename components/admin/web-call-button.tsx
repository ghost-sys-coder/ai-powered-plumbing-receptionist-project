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
        className="gap-3 bg-green-600 px-8 text-base font-semibold text-white shadow-lg shadow-green-600/30 hover:bg-green-500 hover:shadow-green-500/40 dark:bg-green-600 dark:hover:bg-green-500"
      >
        <PhoneCall className="h-5 w-5" />
        Test Agent
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
