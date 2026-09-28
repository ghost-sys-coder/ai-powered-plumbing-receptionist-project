import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/lib/legal";
import { LegalDocument, LegalSection, SupportEmailLink } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: `Data Deletion — ${legal.serviceName}`,
  description: `How callers and businesses can request deletion of their data from ${legal.serviceName}.`,
};

function mailto(subject: string, body: string) {
  return `mailto:${legal.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const callerTemplate = mailto(
  "Data deletion request — caller",
  [
    "Please delete the call data you hold about me.",
    "",
    "Phone number I called from:",
    "Business I called:",
    "Approximate date(s) of the call(s):",
  ].join("\n")
);

const customerTemplate = mailto(
  "Data deletion request — business account",
  [
    "Please delete our business account and its data.",
    "",
    "Business name:",
    "Account email:",
    "Do you want a copy of your call history first? (yes/no):",
  ].join("\n")
);

function RequestButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-[14px] font-medium text-background! no-underline! transition-opacity hover:opacity-90"
    >
      {children}
    </a>
  );
}

export default function DataDeletionPage() {
  const { serviceName, deletionAcknowledgeDays, deletionCompleteDays } = legal;

  return (
    <LegalDocument
      title="Data Deletion"
      intro={
        <p>
          You can ask us to delete the personal information {serviceName} holds about you at any
          time. This page explains how, for both people who called a business using {serviceName}{" "}
          and businesses with a {serviceName} account.
        </p>
      }
    >
      <LegalSection id="callers" title="If you called a business">
        <p>
          When you call a business that uses {serviceName}, we keep your phone number, the details
          you shared (such as your name, address, and the problem you described), an audio
          recording and transcript of the call, a summary, and any appointment you booked.
        </p>
        <p>To have this deleted, email us with:</p>
        <ul>
          <li>the phone number you called from,</li>
          <li>the name of the business you called, and</li>
          <li>roughly when you called.</li>
        </ul>
        <p>
          <RequestButton href={callerTemplate}>Email a deletion request</RequestButton>
        </p>
        <p>
          We hold call data on behalf of the business you called, so we may let that business know
          about your request. You can also ask the business directly.
        </p>
      </LegalSection>

      <LegalSection id="customers" title="If you are a business customer">
        <p>
          Email us from your account email address, or ask your account manager, to close your
          account and delete its data. We can send you a copy of your call history first if you ask.
        </p>
        <p>
          <RequestButton href={customerTemplate}>Request account deletion</RequestButton>
        </p>
        <p>
          You can also ask us to delete individual calls — for example, if a caller asks you to
          remove their information.
        </p>
      </LegalSection>

      <LegalSection id="what-happens" title="What happens next">
        <ul>
          <li>
            We acknowledge your request within {deletionAcknowledgeDays} business days and may ask
            for information to confirm it is genuine. For calls, this usually means confirming you
            have access to the phone number that made them.
          </li>
          <li>
            We complete deletion within {deletionCompleteDays} days of confirming the request, and
            email you when it is done.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="what-we-delete" title="What gets deleted">
        <h3>For a caller</h3>
        <ul>
          <li>Call records linked to your phone number: details, transcripts, and summaries.</li>
          <li>
            Call recordings and transcripts held by our voice AI provider for those calls.
          </li>
          <li>Booking records we created for those calls.</li>
        </ul>
        <h3>For a business account</h3>
        <ul>
          <li>All client portal logins for the account.</li>
          <li>Your AI receptionist and its phone line.</li>
          <li>Your business profile, receptionist configuration, call history, and bookings.</li>
          <li>Call recordings and transcripts held by our voice AI provider.</li>
        </ul>
      </LegalSection>

      <LegalSection id="exceptions" title="What we may keep">
        <ul>
          <li>
            <strong>Calendar appointments</strong> already added to a business&rsquo;s own Google
            Calendar belong to that business. We will pass your request on, but the business
            controls those entries.
          </li>
          <li>
            <strong>Billing and tax records</strong> we are legally required to keep, retained only
            for the period the law requires.
          </li>
          <li>
            <strong>Backups:</strong> deleted data may remain in our database provider&rsquo;s
            backups for a short period until they are overwritten. It is not used or restored in the meantime.
          </li>
          <li>
            Information we need to keep to resolve a dispute, prevent fraud, or meet another legal
            obligation.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="contact" title="Questions">
        <p>
          Email <SupportEmailLink />. For more about how we handle information, see our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
