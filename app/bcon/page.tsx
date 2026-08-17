import { BconFlow } from "../../components/bcon-flow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Conclave 2026 — Registration",
  description:
    "Register for Business Conclave 2026. Fill in your details to secure your spot at the flagship event.",
  openGraph: {
    title: "Business Conclave 2026 — Registration",
    description:
      "Register for Business Conclave 2026. Fill in your details to secure your spot at the flagship event.",
    url: "/bcon",
  },
  twitter: {
    card: "summary",
    title: "Business Conclave 2026 — Registration",
    description: "Register for Business Conclave 2026.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function BconPage() {
  return <BconFlow />;
}
