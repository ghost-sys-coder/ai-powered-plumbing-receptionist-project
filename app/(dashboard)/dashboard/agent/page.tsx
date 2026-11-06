import { notFound, redirect } from "next/navigation";
import { getCustomerId } from "@/lib/auth/get-customer-id";
import { getAgentConfig } from "@/lib/services/dashboard";
import { getCachedLiveAssistantPhoneNumber } from "@/lib/services/live-phone";
import { PageHeader } from "@/components/layout/page-header";
import { AgentStatusCard } from "@/components/agent/agent-status-card";
import { BusinessHoursCard } from "@/components/agent/business-hours-card";
import { ServicesCard } from "@/components/agent/services-card";
import { PricingCard } from "@/components/agent/pricing-card";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/section-header";
import { Mail, ShieldAlert } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { GoogleCalendarConnect } from "@/components/integrations/google-calendar-connect";
import { getCalendarConnection } from "@/lib/services/calendar-connections";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth";

const AgentPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) => {
  const { calendar: calendarNotice } = await searchParams;
  const customerId = await getCustomerId();
  if (!customerId) redirect("/dashboard");

  const agent = await getAgentConfig(customerId);

  if (!agent) notFound();

  // Pull the number actually attached to the assistant in Vapi (source of
  // truth); fall back to the stored value if the live lookup fails.
  const livePhone = await getCachedLiveAssistantPhoneNumber({ customerId: agent.customerId });

  const supportEmail = BRAND.supportEmail;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Receptionist"
        title="How your calls are handled"
        description="What your receptionist knows about your business. Ask us to change anything here."
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AgentStatusCard agent={agent} livePhoneNumber={livePhone?.number ?? null} />
        <Card>
          <SectionHeader
            icon={ShieldAlert}
            title="What counts as an emergency"
            description="Calls that match are treated as urgent"
          />
          <p className="px-5 text-sm leading-relaxed">
            {agent.emergencyDefinition ?? <span className="text-muted-foreground">Not set yet.</span>}
          </p>
        </Card>
      </div>

      <GoogleCalendarConnect
        customerId={agent.customerId}
        configured={isGoogleOAuthConfigured()}
        connection={await getCalendarConnection(agent.customerId)}
        returnTo="/dashboard/agent"
        notice={calendarNotice ?? null}
      />

      <BusinessHoursCard hours={agent.businessHours} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ServicesCard services={agent.servicesOffered} />
        <PricingCard pricing={agent.pricingTable} />
      </div>

      <Card className="bg-muted/30 shadow-none">
        <SectionHeader
          icon={Mail}
          title="Need something changed?"
          description="New hours, services, prices or emergency rules — email us and we'll update your receptionist."
          action={
            <a
              href={`mailto:${supportEmail}?subject=Update%20my%20receptionist`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {supportEmail}
            </a>
          }
        />
      </Card>
    </div>
  );
};

export default AgentPage;
