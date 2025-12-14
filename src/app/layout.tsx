import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { NavbarWrapper } from "@/components/navigation/NavbarWrapper";
import { DevToolsProtection } from "@/components/security/DevToolsProtection";
import { CurrencyProvider } from "@/contexts/CurrencyContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kuwait Re - Analytics Dashboard",
  description: "Kuwait Reinsurance Company - Modern analytics portal for reinsurance operations",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <CurrencyProvider>
            <DevToolsProtection />
            <div className="min-h-screen bg-background">
              <NavbarWrapper />
              <main>{children}</main>
            </div>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
