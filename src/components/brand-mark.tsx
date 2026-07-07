import { cn } from "@/lib/utils";

// Simplified rendition of the Biodegradable Golf Balls mark — a droplet with
// dimples sitting on a golf tee, inside a ring. The original badge's curved
// ring text is intentionally dropped since it's illegible at header sizes.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-7 w-7", className)}
      role="img"
      aria-label="BGBCamp"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="47" stroke="#33402a" strokeWidth="3" />
      {/* Droplet */}
      <path
        d="M50 22 C 50 22 67 45 67 55 A 17 17 0 1 1 33 55 C 33 45 50 22 50 22 Z"
        stroke="#33402a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Dimples */}
      <circle cx="43" cy="59" r="2.1" fill="#33402a" />
      <circle cx="50" cy="61" r="2.1" fill="#33402a" />
      <circle cx="57" cy="59" r="2.1" fill="#33402a" />
      {/* Tee cup + stem */}
      <path
        d="M40 73 Q50 78 60 73 M50 74 L50 86"
        stroke="#33402a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
