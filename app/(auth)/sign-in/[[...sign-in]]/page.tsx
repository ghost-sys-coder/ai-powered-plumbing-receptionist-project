import { PortalShell } from "@/components/auth/portal-shell";
import { ThemedSignIn } from "@/components/auth/themed-sign-in";

const SignInPage = () => {
    return (
        <PortalShell title="Welcome back" subtitle="Sign in to your client portal.">
            <ThemedSignIn />
        </PortalShell>
    );
};

export default SignInPage;
