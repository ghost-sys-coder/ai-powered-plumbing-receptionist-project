"use client";

import { Bot, Mic, MicOff, PhoneOff, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallState =
  | "idle"
  | "requesting"
  | "connecting"
  | "active"
  | "ending"
  | "ended"
  | "error";

type Speaker = "agent" | "caller" | null;

type CallPopupProps = {
  callState: CallState;
  activeSpeaker: Speaker;
  isMuted: boolean;
  errorMessage: string | null;
  onEnd: () => void;
  onToggleMute: () => void;
  onClose: () => void;
};

function statusLabel(callState: CallState, activeSpeaker: Speaker): string {
  switch (callState) {
    case "requesting":
      return "Requesting microphone…";
    case "connecting":
      return "Connecting…";
    case "ending":
      return "Ending call…";
    case "ended":
      return "Call ended";
    case "error":
      return "Call error";
    case "active":
      if (activeSpeaker === "agent") return "Agent is speaking";
      if (activeSpeaker === "caller") return "You're speaking";
      return "Listening…";
    default:
      return "";
  }
}

function SpeakerTile({
  label,
  icon,
  active,
  accent,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  accent: "blue" | "green";
}) {
  const accentRing =
    accent === "green"
      ? "ring-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
      : "ring-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400";

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className="relative">
        {/* pulsing halo when this person is speaking */}
        {active && (
          <span
            className={`absolute inset-0 rounded-full ${
              accent === "green" ? "bg-green-500/30" : "bg-blue-500/30"
            } animate-pulse-ring`}
          />
        )}
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full ring-2 transition-all duration-200 ${
            active
              ? `${accentRing} scale-105`
              : "bg-muted text-muted-foreground ring-transparent opacity-60"
          }`}
        >
          {icon}
        </div>
      </div>
      <span
        className={`text-sm font-medium transition-colors ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function CallPopup({
  callState,
  activeSpeaker,
  isMuted,
  errorMessage,
  onEnd,
  onToggleMute,
  onClose,
}: CallPopupProps) {
  if (callState === "idle") return null;

  const isLive =
    callState === "requesting" ||
    callState === "connecting" ||
    callState === "active" ||
    callState === "ending";
  const isFinished = callState === "ended" || callState === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isFinished ? onClose : undefined}
      />

      <div className="animate-fade-in relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl">
        {isFinished && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <p className="text-center text-sm font-medium text-muted-foreground">
          {statusLabel(callState, activeSpeaker)}
        </p>

        <div className="mt-6 flex items-start justify-center gap-6">
          <SpeakerTile
            label="You (Caller)"
            icon={<User className="h-8 w-8" />}
            active={callState === "active" && activeSpeaker === "caller"}
            accent="blue"
          />
          <SpeakerTile
            label="AI Agent"
            icon={<Bot className="h-8 w-8" />}
            active={callState === "active" && activeSpeaker === "agent"}
            accent="green"
          />
        </div>

        {errorMessage && (
          <p className="mt-4 text-center text-xs text-destructive">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          {callState === "active" && (
            <Button variant="outline" size="sm" onClick={onToggleMute} className="gap-2">
              {isMuted ? (
                <>
                  <MicOff className="h-4 w-4" /> Unmute
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" /> Mute
                </>
              )}
            </Button>
          )}

          {isLive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onEnd}
              disabled={callState === "ending"}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              {callState === "ending" ? "Ending…" : "End call"}
            </Button>
          )}

          {isFinished && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
