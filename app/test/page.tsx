import { TypeformFlow } from "../../components/typeform-flow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Form Test",
  description: "Test environment for the multi-step form flow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TestPage() {
  return <TypeformFlow />;
}
