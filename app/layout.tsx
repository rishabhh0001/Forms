import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://forms.rishabhj.in";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Forms — Rishabh Joshi",
    template: "%s | Forms",
  },
  description: "Registration and form experiences for events and projects by Rishabh Joshi.",
  authors: [{ name: "Rishabh Joshi", url: "https://www.rishabhj.in" }],
  creator: "Rishabh Joshi",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Forms — Rishabh Joshi",
    title: "Forms — Rishabh Joshi",
    description: "Registration and form experiences for events and projects by Rishabh Joshi.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary",
    title: "Forms — Rishabh Joshi",
    description: "Registration and form experiences for events and projects by Rishabh Joshi.",
    creator: "@rishabhj",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#2D1147",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
