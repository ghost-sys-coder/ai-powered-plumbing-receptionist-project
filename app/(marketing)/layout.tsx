import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* scroll reveal observer */}
      <ScrollReveal />
    </>
  );
}
