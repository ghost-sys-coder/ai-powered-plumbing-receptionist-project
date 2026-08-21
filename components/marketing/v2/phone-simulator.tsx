"use client";

import { useEffect, useState, useRef } from "react";
import { PhoneCall, CheckCircle2, RotateCcw, ShieldAlert, Sparkles, Volume2 } from "lucide-react";

interface Message {
  id: number;
  sender: "customer" | "ai";
  text: string;
  timestamp: string;
}

const CONVERSATION: Message[] = [
  {
    id: 1,
    sender: "customer",
    text: "Hi, my water heater just burst and it's leaking everywhere in the basement!",
    timestamp: "10:42 AM",
  },
  {
    id: 2,
    sender: "ai",
    text: "I can help with that emergency right away. Please locate your main water shutoff valve and turn it clockwise immediately to prevent structural damage. Are you at 123 Maple Street?",
    timestamp: "10:42 AM",
  },
  {
    id: 3,
    sender: "customer",
    text: "Yes, that's the address. I got the valve closed. How soon can someone get here?",
    timestamp: "10:43 AM",
  },
  {
    id: 4,
    sender: "ai",
    text: "I have dispatched our on-call emergency technician. Expected arrival is within 45 minutes. You will receive an SMS tracking link and a direct call 5 minutes prior to arrival.",
    timestamp: "10:43 AM",
  },
];

export function PhoneSimulator({ demoNumber = "+1 (571) 743-8660" }: { demoNumber?: string }) {
  const [visibleCount, setVisibleCount] = useState<number>(1);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [jobCaptured, setJobCaptured] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (visibleCount < CONVERSATION.length) {
      setIsTyping(true);
      timer = setTimeout(() => {
        setIsTyping(false);
        setVisibleCount((prev) => prev + 1);
      }, 2200);
    } else {
      setIsTyping(false);
      timer = setTimeout(() => {
        setJobCaptured(true);
      }, 800);
    }

    return () => clearTimeout(timer);
  }, [visibleCount]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleCount, isTyping, jobCaptured]);

  const handleReset = () => {
    setJobCaptured(false);
    setVisibleCount(1);
    setIsTyping(false);
  };

  return (
    <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[400px]">
      {/* Glow effect behind phone */}
      <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-r from-[#0070f3]/20 to-[#0058c3]/15 blur-2xl -z-10" />

      {/* Phone Body */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-[#1e293b] bg-[#0b1326] shadow-2xl">
        {/* Dynamic Island / Notch Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0f172a]/95 px-6 pt-3 pb-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-200">
              AI Receptionist Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="h-2 w-1 rounded-xs bg-slate-400" />
              <span className="h-3 w-1 rounded-xs bg-slate-400" />
              <span className="h-4 w-1 rounded-xs bg-emerald-400" />
            </div>
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-300">
              HD Voice
            </span>
          </div>
        </div>

        {/* Call Banner */}
        <div className="flex items-center justify-between bg-[#131b2e] px-4 py-2 text-xs text-slate-300 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-medium text-amber-300">Emergency Call in Progress</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Volume2 className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            <span>00:48</span>
          </div>
        </div>

        {/* Conversation Stream */}
        <div
          ref={chatContainerRef}
          className="flex h-[360px] flex-col gap-3.5 overflow-y-auto p-4 scroll-smooth scrollbar-thin scrollbar-thumb-slate-700"
        >
          {CONVERSATION.slice(0, visibleCount).map((msg) => {
            const isCustomer = msg.sender === "customer";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCustomer ? "items-start" : "items-end"} animate-fade-up`}
              >
                <span className="mb-1 text-[11px] font-medium text-slate-400">
                  {isCustomer ? "Caller (Customer)" : "PlumberAnswered AI"}
                </span>
                <div
                  className={`max-w-[88%] rounded-2xl p-3 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                    isCustomer
                      ? "rounded-tl-xs bg-[#1e293b] text-slate-100 border border-slate-700/60"
                      : "rounded-tr-xs bg-[#0070f3] text-white font-medium"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="mt-1 text-[10px] text-slate-500">{msg.timestamp}</span>
              </div>
            );
          })}

          {/* Typing / Processing indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 self-end rounded-xl bg-[#0070f3]/20 border border-[#0070f3]/30 px-3 py-2 text-xs text-blue-200">
              <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-spin" />
              <span>AI receptionist speaking...</span>
              <div className="flex gap-1 ml-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
              </div>
            </div>
          )}

          {/* Job Captured Toast */}
          {jobCaptured && (
            <div className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-950/90 p-3 text-emerald-100 shadow-xl backdrop-blur-md animate-fade-up">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-500/20 p-1.5 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Job Captured & Calendar Booked
                    </p>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      High Priority
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-emerald-100/90 font-medium">
                    Emergency Water Heater Repair · 123 Maple St
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-300/80">
                    Dispatched to technician · SMS & audio recording logged
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Simulator Footer Controls */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0f172a] px-4 py-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay demo</span>
          </button>

          <a
            href={`tel:${demoNumber.replace(/\s/g, "")}`}
            className="flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0058c3] transition-all"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Test live call</span>
          </a>
        </div>
      </div>
    </div>
  );
}
