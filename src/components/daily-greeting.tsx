"use client";

import { useEffect, useState } from "react";

// Rotating daily welcome line in the header. Deterministic by date, so the
// whole team sees the same message all day and it changes overnight.
// {name} and {weekday} are filled in at render.
const MESSAGES = [
  "Happy {weekday}, {name}!",
  "Let's make today count, {name} 🚀",
  "Good to see you, {name} 👋",
  "Fresh {weekday}, fresh start ☀️",
  "One task at a time, {name}.",
  "Let's ship something great today ⚡",
  "Make it a good one, {name} 🌱",
  "Small steps, big wins 💪",
  "The team's better with you here, {name}.",
  "Another day, another dozen ⛳",
  "Keep the streak alive, {name} 🔥",
  "Today's a great day to close a task ✅",
  "Coffee first, then greatness ☕",
  "You've got this, {name}.",
  "Progress over perfection 📈",
  "Something good is shipping today 📦",
  "Stay sharp out there, {name} ✨",
  "Fairways and greens, {name} 🏌️",
  "Let's knock a few things off the list.",
  "Big day energy, {name} ⚡",
  "Done beats perfect, every time.",
  "New day, clean slate 🗓️",
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function DailyGreeting({ firstName }: { firstName: string }) {
  // Rendered after mount: the message depends on the viewer's local date,
  // which the server can't know without a hydration mismatch.
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const pick = MESSAGES[(dayOfYear(now) + now.getFullYear()) % MESSAGES.length];
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    setMessage(pick.replaceAll("{name}", firstName).replaceAll("{weekday}", weekday));
  }, [firstName]);

  return (
    <p className="truncate text-[11px] text-muted-foreground" aria-hidden={!message}>
      {message ?? " "}
    </p>
  );
}
