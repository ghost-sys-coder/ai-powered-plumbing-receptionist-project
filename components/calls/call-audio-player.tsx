export function CallAudioPlayer({ audioUrl }: { audioUrl: string | null }) {
  if (!audioUrl) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Recording not available for this call.
      </p>
    );
  }

  return (
    <audio
      controls
      src={audioUrl}
      className="w-full rounded-lg"
    />
  );
}
