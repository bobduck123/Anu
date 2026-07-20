import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Presence", template: "%s | Presence" },
  description: "Not a profile. A place people can enter.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_PRESENCE_PUBLIC_ORIGIN ??
      "http://localhost:3001",
  ),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <style>{`
          :root {
            --font-presence-display: "Instrument Serif", "Cormorant Garamond", "Times New Roman", serif;
            --font-presence-ui: "Geist", "Helvetica Neue", Helvetica, ui-sans-serif, sans-serif;
            --font-presence-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
