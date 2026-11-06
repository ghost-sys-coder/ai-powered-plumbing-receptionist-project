"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type CallState =
  | "idle"
  | "requesting"
  | "connecting"
  | "active"
  | "ending"
  | "ended"
  | "error";

type Speaker = "agent" | "caller" | null;

type UseVapiCallReturn = {
  callState: CallState;
  isMuted: boolean;
  errorMessage: string | null;
  activeSpeaker: Speaker;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  reset: () => void;
};

// What a running call can be asked to do, whichever platform runs it.
type CallControl = { stop: () => void; setMuted: (muted: boolean) => void };

// Test calls from the browser. Works for both voice platforms: the token
// route says which one a business uses, and the matching SDK is loaded only
// when needed.
export function useVapiCall(customerId: string): UseVapiCallReturn {
  const controlRef = useRef<CallControl | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker>(null);

  // Stop call if component unmounts during an active session
  useEffect(() => {
    return () => {
      controlRef.current?.stop();
    };
  }, []);

  const fail = useCallback((message: string) => {
    setErrorMessage(message);
    setCallState("error");
    setActiveSpeaker(null);
    controlRef.current = null;
  }, []);

  const startCall = useCallback(async () => {
    setCallState("requesting");
    setErrorMessage(null);
    setIsMuted(false);
    setActiveSpeaker(null);

    try {
      const res = await fetch("/api/admin/web-call/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to get call token");
      }

      const session = (await res.json()) as
        | { provider: "vapi"; assistantId: string }
        | { provider: "elevenlabs"; signedUrl: string };

      setCallState("connecting");

      if (session.provider === "elevenlabs") {
        const { Conversation } = await import("@elevenlabs/client");
        const conversation = await Conversation.startSession({
          signedUrl: session.signedUrl,
          connectionType: "websocket",
          onConnect: () => setCallState("active"),
          onDisconnect: () => {
            setCallState("ended");
            setActiveSpeaker(null);
            controlRef.current = null;
          },
          onError: (message: string) => {
            console.error("[useVapiCall] elevenlabs error", message);
            fail(message || "Call error occurred");
          },
          // "speaking" = the receptionist is talking; "listening" = the
          // caller's turn.
          onModeChange: ({ mode }: { mode: string }) => setActiveSpeaker(mode === "speaking" ? "agent" : "caller"),
        });
        controlRef.current = {
          stop: () => void conversation.endSession(),
          setMuted: (muted) => conversation.setMicMuted(muted),
        };
        return;
      }

      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY!);
      controlRef.current = { stop: () => vapi.stop(), setMuted: (muted) => vapi.setMuted(muted) };

      vapi.on("call-start", () => setCallState("active"));
      vapi.on("call-end", () => {
        setCallState("ended");
        setActiveSpeaker(null);
        controlRef.current = null;
      });
      vapi.on("error", (err) => {
        console.error("[useVapiCall] error", err);
        fail(err?.message ?? "Call error occurred");
      });

      // "speech-update" fires whenever the assistant or user starts/stops
      // speaking — drives the live speaking indicator.
      vapi.on("message", (msg) => {
        if (msg?.type !== "speech-update") return;
        if (msg.status === "started") {
          setActiveSpeaker(msg.role === "user" ? "caller" : "agent");
        } else if (msg.status === "stopped") {
          setActiveSpeaker((current) => {
            const stopped = msg.role === "user" ? "caller" : "agent";
            return current === stopped ? null : current;
          });
        }
      });

      await vapi.start(session.assistantId);
    } catch (err) {
      console.error("[useVapiCall] startCall failed", err);
      fail((err as Error).message);
    }
  }, [customerId, fail]);

  const endCall = useCallback(() => {
    setCallState("ending");
    controlRef.current?.stop();
  }, []);

  const toggleMute = useCallback(() => {
    if (!controlRef.current) return;
    const next = !isMuted;
    controlRef.current.setMuted(next);
    setIsMuted(next);
  }, [isMuted]);

  const reset = useCallback(() => {
    setCallState("idle");
    setActiveSpeaker(null);
    setErrorMessage(null);
    setIsMuted(false);
  }, []);

  return { callState, isMuted, errorMessage, activeSpeaker, startCall, endCall, toggleMute, reset };
}
