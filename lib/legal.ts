// Single source of truth for the details quoted in the legal pages
// (/terms, /privacy, /data-deletion). Update here and every page follows.
export const legal = {
  serviceName: "PlumberAnswered",
  companyName: "VeilCode Studio",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "frank@veilcode.studio",
  lastUpdated: "September 28, 2026",
  // Business days we commit to for acknowledging / completing deletion requests.
  deletionAcknowledgeDays: 5,
  deletionCompleteDays: 30,
};
