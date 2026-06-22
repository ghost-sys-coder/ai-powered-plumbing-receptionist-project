import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

export function clerkAppearance(isDark: boolean): Appearance {
    const fg = isDark ? "oklch(0.96 0.008 80)" : "oklch(0.18 0.015 250)";
    const mutedFg = isDark ? "oklch(0.66 0.015 260)" : "oklch(0.46 0.015 250)";
    const bg = isDark ? "oklch(0.17 0.01 260)" : "oklch(0.995 0.004 80)";
    const inputBg = isDark ? "oklch(0.22 0.01 260)" : "oklch(0.965 0.005 80)";
    const border = isDark
        ? "color-mix(in oklch, oklch(0.96 0.01 80) 12%, transparent)"
        : "oklch(0.91 0.008 80)";
    const brand = isDark ? "oklch(0.74 0.135 55)" : "oklch(0.58 0.135 48)";
    const brandFg = isDark ? "oklch(0.14 0.008 260)" : "oklch(0.99 0.005 80)";
    const danger = isDark ? "oklch(0.704 0.191 22.216)" : "oklch(0.577 0.245 27.325)";
    const muted = isDark ? "oklch(0.20 0.01 260)" : "oklch(0.955 0.005 80)";

    return {
        variables: {
            colorPrimary: brand,
            colorPrimaryForeground: brandFg,
            colorBackground: bg,
            colorForeground: fg,
            colorMuted: muted,
            colorMutedForeground: mutedFg,
            colorInput: inputBg,
            colorInputForeground: fg,
            colorBorder: border,
            colorNeutral: fg,
            colorDanger: danger,
            colorShimmer: brand,
            colorRing: brand,
            borderRadius: "0.75rem",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontFamilyButtons: "var(--font-geist-sans), system-ui, sans-serif",
            fontSize: "0.875rem",
        },
        elements: {
            rootBox: "w-full",
            cardBox: "w-full max-w-none border-0 shadow-none bg-transparent rounded-none",
            card: "bg-transparent shadow-none border-0 p-0 gap-5",
            header: "hidden",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            main: "gap-4",
            socialButtonsBlockButton:
                "border-border bg-transparent text-foreground hover:bg-muted rounded-lg font-medium h-10 transition-colors",
            socialButtonsBlockButtonText: "text-foreground font-medium",
            socialButtonsBlockButtonArrow: "text-muted-foreground",
            dividerLine: "bg-border",
            dividerText:
                "text-muted-foreground font-mono uppercase tracking-[0.18em] text-[10px]",
            formFieldLabel: "text-foreground text-[12px] font-medium",
            formFieldInput:
                "bg-muted/40 border-border text-foreground rounded-lg h-10 focus:border-brand focus:ring-2 focus:ring-brand/30 transition-colors",
            formFieldAction:
                "text-brand hover:text-brand hover:underline text-[12px]",
            formButtonPrimary:
                "bg-brand text-brand-foreground hover:brightness-110 rounded-lg h-10 font-medium tracking-tight normal-case shadow-[inset_0_1px_0_color-mix(in_oklch,white_18%,transparent),0_10px_30px_-14px_var(--brand)] transition-all",
            footer: "hidden",
            footerAction: "hidden",
            footerActionText: "text-muted-foreground text-[13px]",
            footerActionLink: "text-brand hover:underline font-medium",
            identityPreview:
                "bg-muted/40 border-border rounded-lg",
            identityPreviewText: "text-foreground",
            identityPreviewEditButton: "text-brand",
            otpCodeFieldInput:
                "bg-muted/40 border-border text-foreground rounded-lg focus:border-brand",
            alert: "bg-muted/40 border-border text-foreground rounded-lg",
            alertText: "text-foreground",
            formFieldErrorText: "text-destructive text-[12px]",
            formFieldSuccessText: "text-brand text-[12px]",
            spinner: "text-brand",
            badge: "bg-muted/40 text-muted-foreground border-border",
        },
        options: {
            socialButtonsPlacement: "top",
            socialButtonsVariant: "blockButton",
            showOptionalFields: false,
            logoPlacement: "none",
        },
    };
}
