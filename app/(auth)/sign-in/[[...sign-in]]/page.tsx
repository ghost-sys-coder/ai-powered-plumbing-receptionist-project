import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ThemedSignIn } from "@/components/auth/themed-sign-in";

const SignInPage = () => {
    return (
        <AuthShell
            eyebrow="Sign in · Owner console"
            title="Welcome back to your line."
            subtitle="Pick up where your AI receptionist left off — calls, bookings, and the shop's pulse."
            footer={
                <>
                    First time here?{" "}
                    <Link
                        href="/sign-up"
                        className="font-medium text-brand underline-offset-4 hover:underline"
                    >
                        Set up your shop's line
                    </Link>
                </>
            }
        >
            <ThemedSignIn />
        </AuthShell>
    );
};

export default SignInPage;
