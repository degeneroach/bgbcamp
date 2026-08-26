import type { Metadata } from "next";

// Standalone chrome for the Golf Town portal: no AppShell, no app nav, no
// links back into BGBCamp. Forced dark theme regardless of visitor
// preference, and never indexed.
export const metadata: Metadata = {
  title: "Golf Town Order Portal",
  robots: { index: false, follow: false },
};

export default function GolfTownLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark min-h-screen bg-background text-foreground">{children}</div>;
}
