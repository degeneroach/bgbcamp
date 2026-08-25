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
  // Golf
  "Grip it and rip it, {name} 🏌️",
  "Straight down the fairway today ⛳",
  "Play it as it lies, {name}.",
  "Today's forecast: birdies 🐦",
  "Swing easy, {name} — the tasks will fall.",
  "No mulligans needed today 🏌️",
  "Drive for show, ship for dough ⛳",
  "Sink the putt, {name} — you're this close 🕳️",
  "Tee it high and let it fly 🚀",
  "Eyes on the pin, {name} 🎯",
  // Coffee / Nonna
  "Nonna says: espresso first, then email ☕",
  "Brewed fresh, just like this {weekday} ☕",
  "Slow drip, strong finish, {name} ☕",
  "Nonna would be proud of you, {name} ❤️",
  "Percolating some big ideas today ☕",
  "Life's too short for weak coffee 💪☕",
  "A little cream, a lot of hustle ☕",
  "Nonna's rule: nothing good gets rushed ☕",
];

// Personal flavor pools, keyed by lowercase first name. Every fourth day
// the greeting comes from here instead of the shared pool.
const PERSONAL: Record<string, string[]> = {
  justin: [
    "“The only thing that comes to a sleeping man is dreams.” — 2Pac",
    "“Reality is wrong. Dreams are for real.” — 2Pac",
    "All eyez on the task list today, {name} 👀",
    "Me against the world? Nah — you've got the team, {name} 💪",
    "Keep ya head up, {name} 🙏",
  ],
  summer: [
    "Ho ho ho, {name} — sleigh this {weekday} 🎅",
    "It's beginning to look a lot like productivity 🎄",
    "You're on the nice list, {name} ✨🎁",
    "Deck the halls (and clear the inbox), {name} 🎄",
    "Snow much to do, {name} — let's go ❄️",
  ],
};

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
    const day = dayOfYear(now) + now.getFullYear();
    const personal = PERSONAL[firstName.toLowerCase()] ?? [];
    const pick =
      personal.length > 0 && day % 4 === 0
        ? personal[Math.floor(day / 4) % personal.length]
        : MESSAGES[day % MESSAGES.length];
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    setMessage(pick.replaceAll("{name}", firstName).replaceAll("{weekday}", weekday));
  }, [firstName]);

  return (
    <p className="truncate text-[11px] text-muted-foreground" aria-hidden={!message}>
      {message ?? " "}
    </p>
  );
}
