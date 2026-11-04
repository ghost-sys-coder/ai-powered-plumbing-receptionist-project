// Vapi stores call recordings in a private bucket: the recordingUrl saved from
// the webhook can't be fetched directly. Vapi's recording endpoint instead
// responds with a 302 to a short-lived (~30 min) signed URL. Returns that URL,
// or null if Vapi has no recording for the call.
export async function getSignedRecordingUrl(
  vapiCallId: string,
  apiKey: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.vapi.ai/call/${encodeURIComponent(vapiCallId)}/mono-recording`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      redirect: "manual",
      cache: "no-store",
    }
  );

  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) return location;

  console.warn(`[recording] no signed URL for call ${vapiCallId} (status ${res.status})`);
  return null;
}
