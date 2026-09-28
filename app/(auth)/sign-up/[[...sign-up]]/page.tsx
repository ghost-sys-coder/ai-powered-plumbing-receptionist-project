import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/auth/portal-shell";
import { ThemedSignUp } from "@/components/auth/themed-sign-up";

type SignUpPageProps = {
    params: Promise<{ "sign-up"?: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Sign-up is invite-only. Clerk invitation emails link to /sign-up with a
// `__clerk_ticket` param; anyone landing there without one goes to the sign-in
// portal. Later steps (/sign-up/continue, etc.) drop the param, so only the
// entry URL is gated here — Clerk's "Restricted" sign-up mode blocks any
// ticketless sign-up attempt server-side regardless.
const SignUpPage = async ({ params, searchParams }: SignUpPageProps) => {
    const [{ "sign-up": step }, { __clerk_ticket: ticket }] = await Promise.all([
        params,
        searchParams,
    ]);
    if (!step?.length && !ticket) redirect("/v2");

    return (
        <PortalShell
            title="Accept your invitation"
            subtitle="Create your password to access your client portal."
            footer={
                <>
                    Already have an account?{" "}
                    <Link
                        href="/v2"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        Sign in
                    </Link>
                </>
            }
        >
            <ThemedSignUp />
        </PortalShell>
    );
};

export default SignUpPage;
