import { notFound, redirect } from "next/navigation";
import { getCustomerId } from "@/lib/auth/get-customer-id";
import { getAgentConfig } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { AgentStatusCard } from "@/components/agent/agent-status-card";
import { BusinessHoursCard } from "@/components/agent/business-hours-card";
import { ServicesCard } from "@/components/agent/services-card";
import { PricingCard } from "@/components/agent/pricing-card";
import { Card, CardContent } from "@/components/ui/card";

const AgentPage = async () => {
  const customerId = await getCustomerId();
  if (!customerId) redirect("/dashboard");

  const agent = await getAgentConfig(customerId);

  if (!agent) notFound();

  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@plumberanswered.com";

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Your AI Agent"
        description="Managed by PlumberAnswered — contact us to make changes"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <AgentStatusCard agent={agent} />
        <Card>
          <CardContent className="space-y-2 pt-6 text-sm">
            <p className="font-medium">Emergency definition</p>
            <p className="text-muted-foreground">
              {agent.emergencyDefinition ?? "Not configured."}
            </p>
          </CardContent>
        </Card>
      </div>

      <BusinessHoursCard hours={agent.businessHours} />

      <div className="grid gap-4 md:grid-cols-2">
        <ServicesCard services={agent.servicesOffered} />
        <PricingCard pricing={agent.pricingTable} />
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm">
          <p className="font-medium">Need to update your settings?</p>
          <p className="mt-1 text-muted-foreground">
            Contact your PlumberAnswered manager to update your agent configuration.
            Changes are applied within 24 hours.
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400"
          >
            {supportEmail}
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPage;
