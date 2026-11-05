import { Bot, MessageSquareOff } from "lucide-react";
import { EmptyNote } from "@/components/layout/section-header";
import { cn } from "@/lib/utils";

interface TranscriptLine {
  speaker: "AI" | "Caller" | "Other";
  text: string;
}

function parseTranscript(raw: string): TranscriptLine[] {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("AI:")) return { speaker: "AI" as const, text: line.slice(3).trim() };
      if (line.startsWith("Caller:")) return { speaker: "Caller" as const, text: line.slice(7).trim() };
      return { speaker: "Other" as const, text: line };
    });
}

export function CallTranscript({ transcript }: { transcript: string | null }) {
  if (!transcript) {
    return <EmptyNote icon={MessageSquareOff}>No transcript for this call.</EmptyNote>;
  }

  const lines = parseTranscript(transcript);

  return (
    <ol className="space-y-3 text-sm">
      {lines.map((line, i) => {
        if (line.speaker === "Other") {
          return (
            <li key={i} className="text-center text-xs text-muted-foreground">
              {line.text}
            </li>
          );
        }
        const ai = line.speaker === "AI";
        // Only label the first line of a run of turns from the same speaker.
        const showLabel = lines[i - 1]?.speaker !== line.speaker;
        return (
          <li key={i} className={cn("flex flex-col gap-1", ai ? "items-start" : "items-end")}>
            {showLabel && (
              <span className="flex items-center gap-1 px-1 text-[0.6875rem] font-medium text-muted-foreground">
                {ai && <Bot className="size-3 text-primary" />}
                {ai ? "Receptionist" : "Caller"}
              </span>
            )}
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed",
                ai
                  ? "rounded-tl-md bg-primary/[0.08] text-foreground ring-1 ring-inset ring-primary/10"
                  : "rounded-tr-md bg-muted text-foreground ring-1 ring-inset ring-foreground/[0.05]"
              )}
            >
              {line.text}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
