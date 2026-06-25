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

type UseVapiCallReturn = {
  callState: CallState;
  isMuted: boolean;
  errorMessage: string | null;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
};

export function useVapiCall(customerId: string): UseVapiCallReturn {
  const vapiRef = useRef<Vapi | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        vapiRef.current = null;
      });
      vapi.on("error", (err) => {
        console.error("[useVapiCall] error", err);
        setErrorMessage(err?.message ?? "Call error occurred");
        setCallState("error");
        vapiRef.current = null;
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

  return { callState, isMuted, errorMessage, startCall, endCall, toggleMute };
}
