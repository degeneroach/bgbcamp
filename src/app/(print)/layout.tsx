// Chrome-free layout for printable sheets: no AppShell (nav, favorites bar),
// just a dark backdrop on screen so the white sheet reads as a document
// preview. Print media strips the backdrop entirely.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0b0e13] print:min-h-0 print:bg-white">{children}</div>;
}
