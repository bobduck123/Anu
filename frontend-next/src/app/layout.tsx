import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { SentryProvider } from "@/providers/SentryProvider";
import { ThemeProvider } from "@/ui-system/ThemeProvider";
import { TenantBrandWrapper } from "@/ui-system/layout/TenantBrandWrapper";
import { LayoutShell } from "@/ui-system/layout/LayoutShell";
import { Preloader } from "@/components/layout/Preloader";
import { ModeBanner } from "@/components/systemic/ModeBanner";
import { brand } from '@/lib/brand';
import "./globals.css";

const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    { path: "../fonts/inter-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-latin-600.woff2", weight: "600", style: "normal" },
  ],
});

const jetbrainsMono = localFont({
  variable: "--font-jetbrains-mono",
  display: "swap",
  src: [
    { path: "../fonts/jetbrains-mono-latin-400.woff2", weight: "400", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: brand.homepageTitle,
  description: brand.description,
  keywords: brand.keywords,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <SentryProvider>
              <QueryProvider>
                <ThemeProvider>
                  <TenantBrandWrapper>
                    <Preloader />
                    <ModeBanner />
                    <LayoutShell>
                      {children}
                    </LayoutShell>
                  </TenantBrandWrapper>
                </ThemeProvider>
              </QueryProvider>
            </SentryProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
