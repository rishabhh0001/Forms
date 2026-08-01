import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typeform Flow Demo",
  description: "A Typeform-style multi-step form with branching logic, motion, and keyboard navigation.",
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
