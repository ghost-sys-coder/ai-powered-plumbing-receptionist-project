"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Vapi from "@vapi-ai/web";

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

export function useVapiCall(customerId: string): UseVapiCallReturn {
  const vapiRef = useRef<Vapi | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker>(null);

  // Stop call if component unmounts during an active session
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
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

      const { assistantId } = await res.json();

      setCallState("connecting");

      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY!);
      vapiRef.current = vapi;

      vapi.on("call-start", () => setCallState("active"));
      vapi.on("call-end", () => {
        setCallState("ended");
        setActiveSpeaker(null);
        vapiRef.current = null;
      });
      vapi.on("error", (err) => {
        console.error("[useVapiCall] error", err);
        setErrorMessage(err?.message ?? "Call error occurred");
        setCallState("error");
        setActiveSpeaker(null);
        vapiRef.current = null;
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

      await vapi.start(assistantId);
    } catch (err) {
      console.error("[useVapiCall] startCall failed", err);
      setErrorMessage((err as Error).message);
      setCallState("error");
    }
  }, [customerId]);

  const endCall = useCallback(() => {
    setCallState("ending");
    vapiRef.current?.stop();
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
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
