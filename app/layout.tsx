import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { appOrigin } from "@/lib/app-origin";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL(appOrigin()),
    title: `${BRAND.name} — AI that answers when you can't`,
    description:
        "AI receptionist for service businesses. Answers every call, books appointments, and alerts you to emergencies.",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-screen bg-background text-foreground font-sans">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ClerkProvider>
                        {children}
                        <Toaster richColors closeButton position="top-right" />
                    </ClerkProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
