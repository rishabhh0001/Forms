import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offset Form",
  description: "A focused, responsive form experience with branching logic and cinematic motion.",
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
