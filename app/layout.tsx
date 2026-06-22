import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme/theme-provider";
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
    title: "PlumbVoice — AI that answers when you can't",
    description:
        "Premium AI receptionist for solo plumbing businesses. Books jobs, triages emergencies, never misses a call.",
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
                    defaultTheme="dark"
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
