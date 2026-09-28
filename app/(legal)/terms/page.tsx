import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/lib/legal";
import { LegalDocument, LegalSection, SupportEmailLink } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: `Terms of Service — ${legal.serviceName}`,
  description: `The terms that govern use of the ${legal.serviceName} AI receptionist and client portal.`,
};

export default function TermsPage() {
  const { serviceName, companyName } = legal;

  return (
    <LegalDocument
      title="Terms of Service"
      intro={
        <p>
          These terms are an agreement between {companyName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
          and the business that uses {serviceName} (&ldquo;you&rdquo;, the &ldquo;Customer&rdquo;).
          By using the service or the client portal, you agree to them. If you use {serviceName} on
          behalf of a business, you confirm you are authorized to accept these terms for it.
        </p>
      }
    >
      <LegalSection id="the-service" title="1. The service">
        <p>
          {serviceName} provides an AI voice receptionist that answers calls to your business line,
          gathers caller details, identifies urgent requests, quotes the information you give us,
          and books appointments into your calendar. You can review calls, recordings, transcripts,
          and bookings in the client portal. We set up and configure your receptionist based on the
          information you provide.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="2. Accounts and access">
        <ul>
          <li>
            Access to the client portal is <strong>by invitation only</strong>. We create your
            account and send login invitations to the people you designate.
          </li>
          <li>
            Keep login details confidential, and tell us promptly if you believe your account has
            been accessed without permission. You are responsible for activity under your account.
          </li>
          <li>You must provide accurate information and keep it up to date.</li>
        </ul>
      </LegalSection>

      <LegalSection id="fees" title="3. Plans, fees, and payment">
        <p>
          Pricing, plan features, trial or pilot periods, and billing terms are set out in the
          proposal or order agreed with you, which forms part of these terms. Unless that agreement
          says otherwise, fees are billed in advance, are non-refundable, and exclude taxes. We may
          suspend the service if payment is significantly overdue, after giving you notice. Any
          price changes will be agreed with you or notified in advance of your next billing period.
        </p>
      </LegalSection>

      <LegalSection id="your-responsibilities" title="4. Your responsibilities">
        <ul>
          <li>
            <strong>Accurate configuration.</strong> The receptionist relies on the services,
            prices, hours, service area, and emergency criteria you give us. Review them and tell us
            when anything changes. You are responsible for the quotes and commitments made from
            that information.
          </li>
          <li>
            <strong>Call recording and consent.</strong> Calls are recorded and transcribed, and
            are answered by AI. You are responsible for complying with the laws that apply to your
            calls — including giving any required notice that calls are recorded or answered by an
            automated system, and obtaining consent where the law requires it.
          </li>
          <li>
            <strong>Your calendar.</strong> Keep the calendar you connect accurate. Bookings are
            made against the availability it shows.
          </li>
          <li>
            <strong>Your customers.</strong> You remain responsible for your relationship with your
            callers, including following up on messages, honoring bookings, and handling their
            privacy requests.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="ai-limitations" title="5. AI limitations and emergencies">
        <p>
          The receptionist is an automated AI system. It can mishear callers, misunderstand
          requests, or give incomplete information, and it may occasionally be unavailable due to
          outages at telephone or AI providers. Review call summaries and recordings for important
          details, and do not rely on the receptionist as your only record of a job.
        </p>
        <p>
          <strong>
            {serviceName} is not an emergency service and cannot contact emergency services.
          </strong>{" "}
          Identifying a call as urgent is a best-effort triage to help you prioritize — it is not a
          safety assessment. Situations involving danger to people or property, such as gas leaks,
          fire, or electrical hazards, should be directed to the appropriate emergency services.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>use the service for unlawful, deceptive, harassing, or fraudulent purposes;</li>
          <li>
            use it to make unsolicited or marketing calls, or in any way that breaches
            telemarketing, anti-spam, or consumer protection laws;
          </li>
          <li>
            attempt to access other customers&rsquo; data, probe or disrupt our systems, or reverse
            engineer the service; or
          </li>
          <li>resell or provide the service to third parties without our written agreement.</li>
        </ul>
      </LegalSection>

      <LegalSection id="data" title="7. Data and privacy">
        <p>
          You own your business data and the call data collected on your behalf. You give us
          permission to use it to provide, maintain, secure, and support the service. We handle
          personal information as described in our <Link href="/privacy">Privacy Policy</Link>, and
          you can request deletion as described on our{" "}
          <Link href="/data-deletion">Data Deletion</Link> page.
        </p>
      </LegalSection>

      <LegalSection id="third-parties" title="8. Third-party services">
        <p>
          {serviceName} depends on third-party providers, including voice AI, telephony,
          calendar, authentication, and hosting providers. Their availability is outside our
          control, and your use of connected services such as Google Calendar is also subject to
          their terms.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="9. Our intellectual property">
        <p>
          We own the {serviceName} service, software, receptionist prompts and configurations we
          create, and all related intellectual property. These terms give you the right to use the
          service during your subscription; they do not transfer ownership. If you send us
          suggestions, we may use them without obligation to you.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="10. Suspension and termination">
        <p>
          Either party may end the service as set out in your order, or, if none applies, with 30
          days&rsquo; written notice. We may suspend or end access immediately if you materially
          breach these terms, misuse the service, or if required by law. When the service ends,
          your receptionist and phone line are deactivated and your data is deleted as described in
          our Privacy Policy. Ask us before it ends if you want a copy of your call history.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="11. Disclaimers">
        <p>
          We work to keep {serviceName} reliable, but it is provided &ldquo;as is&rdquo; and
          &ldquo;as available&rdquo;. To the extent the law allows, we disclaim all warranties,
          express or implied, including fitness for a particular purpose and that the service will
          be uninterrupted, error-free, or will answer or book every call correctly.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="12. Limitation of liability">
        <p>
          To the extent the law allows, neither party is liable for indirect, incidental, special,
          or consequential damages, or for lost profits, revenue, jobs, or business opportunities —
          including from missed, misrouted, or incorrectly handled calls or bookings. Our total
          liability arising from these terms or the service is limited to the fees you paid us in
          the 12 months before the claim arose. Nothing in these terms limits liability that cannot
          be limited by law.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="13. Indemnity">
        <p>
          You agree to defend and indemnify us against claims arising from your use of the service
          in breach of these terms or the law — including failing to give callers any required
          recording or AI notices — and from the information you ask the receptionist to provide.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="14. Changes to these terms">
        <p>
          We may update these terms from time to time. We will change the &ldquo;last
          updated&rdquo; date and notify you of material changes by email or in the client portal
          at least 30 days before they take effect. Continuing to use the service after that means
          you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection id="general" title="15. General">
        <p>
          These terms and your order are the entire agreement between us about {serviceName}. If
          any part is found unenforceable, the rest remains in effect. Neither party may assign
          these terms without the other&rsquo;s consent, except as part of a merger or sale of the
          business. Any disputes will be governed by the laws and courts of the jurisdiction where{" "}
          {companyName} is established, unless your order specifies otherwise.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="16. Contact">
        <p>
          Questions about these terms: <SupportEmailLink />.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
