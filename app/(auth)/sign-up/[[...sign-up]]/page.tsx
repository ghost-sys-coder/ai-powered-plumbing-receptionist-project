import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ThemedSignUp } from "@/components/auth/themed-sign-up";

const SignUpPage = () => {
    return (
        <AuthShell
            eyebrow="New shop · 14-day pilot"
            title="Give your business a line that never sleeps."
            subtitle="Set up in a few minutes. Forward your number when you're ready — your AI handles the rest."
            footer={
                <>
                    Already onboarded?{" "}
                    <Link
                        href="/sign-in"
                        className="font-medium text-brand underline-offset-4 hover:underline"
                    >
                        Sign in to your console
                    </Link>
                </>
            }
        >
            <ThemedSignUp />
        </AuthShell>
    );
};

export default SignUpPage;
