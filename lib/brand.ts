// Product name and mark shown inside the app. One place to change for the
// rename (and later, per-agency white-label branding).
export const BRAND = {
  name: "AnswerSteady",
  initials: "AS",
  domain: "answersteady.com",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "frank@veilcode.studio",
} as const;
