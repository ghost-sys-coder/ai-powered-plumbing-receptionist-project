"use client";

import { useState } from "react";

type CallAudioPlayerProps = {
  callId: string;
  hasRecording: boolean;
};

// Plays through /api/calls/[id]/recording, which redirects to a short-lived
// signed URL. preload="none" defers that request until the user presses play,
// so the signed URL can't expire while the page sits open.
export function CallAudioPlayer({ callId, hasRecording }: CallAudioPlayerProps) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!hasRecording) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Recording not available for this call.
      </p>
    );
  }

  if (failed) {
    return (
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load this recording.{" "}
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Try again
        </button>
      </p>
    );
  }

  return (
    <audio
      key={attempt}
      controls
      preload="none"
      src={`/api/calls/${callId}/recording?attempt=${attempt}`}
      onError={() => setFailed(true)}
      className="w-full rounded-lg"
    />
  );
}
