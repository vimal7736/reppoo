import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your GreenTrack AI account and start tracking your business carbon footprint today. Free plan available.",
  alternates: {
    canonical: "/signup",
  },
  openGraph: {
    title: "Create Account | GreenTrack AI",
    description: "Start tracking your business carbon footprint today. Free plan available.",
    url: "/signup",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
