"use client";

import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Golf Town distributor pricing: $25 setup per project (design), then a
// per-hit rate by order volume — a "hit" is one imprint on one ball, so
// double-sided is two hits per ball.
const SETUP_FEE = 25;
const TIERS = [
  { minDozen: 1, maxDozen: 50, rate: 0.4, label: "1 – 50 dozen", balls: "12 – 600 balls" },
  { minDozen: 51, maxDozen: 150, rate: 0.3, label: "51 – 150 dozen", balls: "612 – 1,800 balls" },
  { minDozen: 151, maxDozen: Infinity, rate: 0.25, label: "151+ dozen", balls: "1,812+ balls" },
];

function intVal(value: string): number {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function CountInput({
  id,
  value,
  onChange,
  suffix,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        min={0}
        step="1"
        inputMode="numeric"
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          if (parseInt(e.target.value, 10) < 0) onChange("0");
        }}
        className={cn("text-right tabular-nums", suffix && "pr-14")}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function GolfTownCalculator() {
  const [dozens, setDozens] = useState("");
  const [sides, setSides] = useState<1 | 2>(1);
  const [projects, setProjects] = useState("1");
  const [flash, setFlash] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const dozensN = intVal(dozens);
    const balls = dozensN * 12;
    const projectsN = intVal(projects);
    const tier = TIERS.find((t) => dozensN >= t.minDozen && dozensN <= t.maxDozen) ?? null;
    const perBall = (tier?.rate ?? 0) * sides;
    const perDozen = perBall * 12;
    const printCost = balls * perBall;
    const setupCost = projectsN * SETUP_FEE;
    return {
      dozensN,
      balls,
      projectsN,
      tier,
      perBall,
      perDozen,
      printCost,
      setupCost,
      total: printCost + setupCost,
    };
  }, [dozens, sides, projects]);

  function handleCalculate() {
    setFlash(true);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => setFlash(false), 700);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
      {/* Inputs */}
      <Card className="flex flex-col gap-6 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gt-dozens" className="text-xs text-muted-foreground">
              Order size (packs of 12)
            </Label>
            <CountInput id="gt-dozens" value={dozens} onChange={setDozens} suffix="doz" />
            {results.dozensN > 0 && (
              <p className="text-xs text-muted-foreground">
                = {results.balls.toLocaleString()} balls
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gt-projects" className="text-xs text-muted-foreground">
              Projects (designs) — ${SETUP_FEE} setup each
            </Label>
            <CountInput id="gt-projects" value={projects} onChange={setProjects} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Imprint</Label>
          <div className="flex w-fit overflow-hidden rounded-lg border">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSides(n)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  sides === n
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {n === 1 ? "Single sided" : "Double sided"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Double sided = 2 pole locations, so 2 hits per ball.
          </p>
        </div>

        {/* Tier reference, with the active tier highlighted */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Rate card (per imprint location)</Label>
          <div className="overflow-hidden rounded-lg border text-sm">
            {TIERS.map((tier) => {
              const active = results.tier === tier;
              return (
                <div
                  key={tier.label}
                  className={cn(
                    "flex items-center justify-between border-b px-3 py-2 last:border-b-0",
                    active && "bg-primary/10 font-medium text-primary"
                  )}
                >
                  <span>
                    {tier.label}{" "}
                    <span className={cn("text-xs", active ? "text-primary/80" : "text-muted-foreground")}>
                      ({tier.balls})
                    </span>
                  </span>
                  <span className="tabular-nums">${tier.rate.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card
        ref={resultsRef}
        className={cn(
          "flex flex-col gap-4 p-5 transition-shadow duration-300 lg:sticky lg:top-20",
          flash && "ring-2 ring-primary shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Invoice total</h2>
          <Button variant="default" size="sm" className="rounded-full" onClick={handleCalculate}>
            Calculate
          </Button>
        </div>

        {results.dozensN === 0 ? (
          <p className="py-10 text-center text-sm italic text-muted-foreground">
            Enter the order size to see the total
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Rate tier</span>
              <span className="font-medium">{results.tier?.label}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Per ball</span>
              <span className="font-medium tabular-nums">
                ${(results.tier?.rate ?? 0).toFixed(2)} × {sides} {sides === 1 ? "side" : "sides"} ={" "}
                {money(results.perBall)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Per dozen</span>
              <span className="font-medium tabular-nums">
                {money(results.perDozen)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">
                Printing ({results.balls.toLocaleString()} balls)
              </span>
              <span className="font-medium tabular-nums">{money(results.printCost)}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">
                Setup ({results.projectsN} × {money(SETUP_FEE)})
              </span>
              <span className="font-medium tabular-nums">{money(results.setupCost)}</span>
            </div>

            <div className="my-1 border-t" />

            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total owed</span>
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {money(results.total)}
              </span>
            </div>
            <p className="text-right text-xs text-muted-foreground">before GST / taxes</p>
          </div>
        )}
      </Card>
    </div>
  );
}
