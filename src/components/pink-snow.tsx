"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

// Falling snow for the Pink theme: mostly white flakes with some pink ones,
// drawn on a fixed canvas at z-index -1 — above the page background (which
// propagates from <body> to the viewport) but behind all content, so it
// never blocks clicks or hides text.
export function PinkSnow() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || resolvedTheme !== "pink") return null;
  return <SnowCanvas />;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  color: string;
}

// Mostly white, every so often a pink one.
const COLORS = ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#f9a8d4", "#f472b6"];

function SnowCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    let raf = 0;

    function makeFlake(startAnywhere: boolean): Flake {
      return {
        x: Math.random() * width,
        y: startAnywhere ? Math.random() * height : -6,
        r: 1 + Math.random() * 2.4,
        speed: 0.4 + Math.random() * 0.9,
        drift: Math.random() * 0.5 - 0.25,
        phase: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    }

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
      flakes = Array.from({ length: Math.min(110, Math.max(40, Math.floor(width / 14))) }, () =>
        makeFlake(true)
      );
    }

    function frame() {
      ctx!.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.y += f.speed;
        f.phase += 0.01;
        f.x += f.drift + Math.sin(f.phase) * 0.3;
        if (f.y > height + 6) {
          Object.assign(f, makeFlake(false));
        }
        if (f.x > width + 6) f.x = -6;
        if (f.x < -6) f.x = width + 6;
        ctx!.globalAlpha = 0.85;
        ctx!.fillStyle = f.color;
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[-1]"
    />
  );
}
