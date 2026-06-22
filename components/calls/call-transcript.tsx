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
    return (
      <p className="text-sm italic text-muted-foreground">
        No transcript available for this call.
      </p>
    );
  }

  const lines = parseTranscript(transcript);

  return (
    <div className="space-y-4 font-mono text-sm">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex gap-3 ${line.speaker === "AI" ? "" : "flex-row-reverse"}`}
        >
          <span
            className={`mt-2 shrink-0 text-[10px] font-bold uppercase tracking-widest ${
              line.speaker === "AI"
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {line.speaker === "Other" ? "" : line.speaker}
          </span>
          <p
            className={`max-w-prose rounded-lg px-3 py-2 leading-relaxed ${
              line.speaker === "AI"
                ? "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                : line.speaker === "Caller"
                ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                : "text-muted-foreground"
            }`}
          >
            {line.text}
          </p>
        </div>
      ))}
    </div>
  );
}
