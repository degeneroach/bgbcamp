"use client";

import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MARKETPLACES = ["US", "CA", "MX", "UK", "DE", "FR", "IT", "ES", "JP", "AU"];

const CATEGORIES = [
  "Sports & Outdoors",
  "Home & Kitchen",
  "Kitchen & Dining",
  "Toys & Games",
  "Health & Household",
  "Beauty & Personal Care",
  "Grocery & Gourmet Food",
  "Patio, Lawn & Garden",
  "Pet Supplies",
  "Office Products",
  "Tools & Home Improvement",
  "Electronics",
  "Clothing, Shoes & Jewelry",
  "Baby",
  "Automotive",
  "Other",
];

/** Parse a money/number field: empty -> 0, negatives clamp to 0. */
function num(value: string): number {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function MoneyInput({
  id,
  value,
  onChange,
  placeholder = "0.00",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        id={id}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          if (parseFloat(e.target.value) < 0) onChange("0");
        }}
        className="pl-6 text-right tabular-nums"
      />
    </div>
  );
}

function SuffixInput({
  value,
  onChange,
  suffix,
  placeholder = "0",
}: {
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          if (parseFloat(e.target.value) < 0) onChange("0");
        }}
        className="pr-9 text-right tabular-nums"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function marginTone(pct: number): string {
  if (pct >= 30) return "text-success";
  if (pct >= 15) return "text-foreground";
  return "text-destructive";
}

export function AmazonMarginsCalculator() {
  // Product
  const [productName, setProductName] = useState("");
  const [marketplace, setMarketplace] = useState("US");
  const [category, setCategory] = useState<string | null>(null);
  // Dimensions & weight
  const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">("imperial");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  // Pricing
  const [price, setPrice] = useState("");
  const [shippingCharge, setShippingCharge] = useState("");
  // Costs
  const [cogs, setCogs] = useState("");
  const [inbound, setInbound] = useState("");
  const [referralMode, setReferralMode] = useState<"percent" | "flat">("percent");
  const [referralValue, setReferralValue] = useState("15");
  const [fbaFee, setFbaFee] = useState("");
  const [storageFee, setStorageFee] = useState("");
  const [otherCosts, setOtherCosts] = useState("");

  const [flash, setFlash] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const lengthSuffix = unitSystem === "imperial" ? "in" : "cm";
  const weightSuffix = unitSystem === "imperial" ? "lb" : "kg";

  const results = useMemo(() => {
    const priceN = num(price);
    const revenue = priceN + num(shippingCharge);
    const referralFee =
      referralMode === "percent" ? priceN * (num(referralValue) / 100) : num(referralValue);
    const amazonFees = referralFee + num(fbaFee) + num(storageFee);
    const ownCosts = num(cogs) + num(inbound) + num(otherCosts);
    const totalCost = ownCosts + amazonFees;
    const netProfit = revenue - totalCost;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const roi = ownCosts > 0 ? (netProfit / ownCosts) * 100 : 0;
    return {
      hasPrice: priceN > 0,
      revenue,
      referralFee,
      amazonFees,
      totalCost,
      netProfit,
      netMargin,
      roi,
      hasOwnCosts: ownCosts > 0,
    };
  }, [price, shippingCharge, referralMode, referralValue, fbaFee, storageFee, cogs, inbound, otherCosts]);

  function handleCalculate() {
    setFlash(true);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => setFlash(false), 700);
  }

  const marketplaceItems: Record<string, React.ReactNode> = Object.fromEntries(
    MARKETPLACES.map((m) => [m, m])
  );
  const categoryItems: Record<string, React.ReactNode> = Object.fromEntries(
    CATEGORIES.map((c) => [c, c])
  );
  const unitItems: Record<string, React.ReactNode> = {
    imperial: "in / lb",
    metric: "cm / kg",
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
      {/* Inputs */}
      <Card className="flex flex-col gap-6 p-5">
        <div className="flex flex-col gap-3">
          <SectionLabel>Product</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="am-name" className="text-xs text-muted-foreground">
              Product name
            </Label>
            <Input
              id="am-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Biodegradable Golf Balls (12 pack)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Marketplace</Label>
              <Select items={marketplaceItems} value={marketplace} onValueChange={(v) => v && setMarketplace(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKETPLACES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select items={categoryItems} value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Dimensions &amp; weight</SectionLabel>
            <Select items={unitItems} value={unitSystem} onValueChange={(v) => v && setUnitSystem(v as "imperial" | "metric")}>
              <SelectTrigger className="h-7 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imperial">in / lb</SelectItem>
                <SelectItem value="metric">cm / kg</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Length</Label>
              <SuffixInput value={length} onChange={setLength} suffix={lengthSuffix} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Width</Label>
              <SuffixInput value={width} onChange={setWidth} suffix={lengthSuffix} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Height</Label>
              <SuffixInput value={height} onChange={setHeight} suffix={lengthSuffix} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Unit weight</Label>
              <SuffixInput value={weight} onChange={setWeight} suffix={weightSuffix} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Pricing</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="am-price" className="text-xs text-muted-foreground">
                Item price
              </Label>
              <MoneyInput id="am-price" value={price} onChange={setPrice} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Shipping charge</Label>
              <MoneyInput value={shippingCharge} onChange={setShippingCharge} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Costs</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Cost of goods</Label>
              <MoneyInput value={cogs} onChange={setCogs} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Inbound shipping / unit</Label>
              <MoneyInput value={inbound} onChange={setInbound} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Amazon referral fee</Label>
              <div className="flex gap-1.5">
                {referralMode === "percent" ? (
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      inputMode="decimal"
                      value={referralValue}
                      onChange={(e) => setReferralValue(e.target.value)}
                      className="pr-7 text-right tabular-nums"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                ) : (
                  <div className="flex-1">
                    <MoneyInput value={referralValue} onChange={setReferralValue} />
                  </div>
                )}
                <div className="flex overflow-hidden rounded-lg border">
                  {(["percent", "flat"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setReferralMode(mode);
                        setReferralValue(mode === "percent" ? "15" : "");
                      }}
                      className={cn(
                        "px-2.5 text-xs font-medium transition-colors",
                        referralMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {mode === "percent" ? "%" : "$"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">FBA fulfillment fee</Label>
              <MoneyInput value={fbaFee} onChange={setFbaFee} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Storage fee / unit</Label>
              <MoneyInput value={storageFee} onChange={setStorageFee} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Other costs</Label>
              <MoneyInput value={otherCosts} onChange={setOtherCosts} />
            </div>
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
          <h2 className="font-medium">Results</h2>
          <Button variant="default" size="sm" className="rounded-full" onClick={handleCalculate}>
            Calculate
          </Button>
        </div>

        {!results.hasPrice ? (
          <p className="py-10 text-center text-sm italic text-muted-foreground">
            Enter product details to see margins
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium tabular-nums">{money(results.revenue)}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Total Amazon fees</span>
              <span className="font-medium tabular-nums">−{money(results.amazonFees)}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Total cost</span>
              <span className="font-medium tabular-nums">−{money(results.totalCost)}</span>
            </div>

            <div className="my-1 border-t" />

            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Net profit</span>
              <span
                className={cn(
                  "text-2xl font-semibold tabular-nums tracking-tight",
                  results.netProfit < 0 && "text-destructive"
                )}
              >
                {results.netProfit < 0 ? `−${money(Math.abs(results.netProfit))}` : money(results.netProfit)}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Net margin</span>
              <span className={cn("font-semibold tabular-nums", marginTone(results.netMargin))}>
                {results.netMargin.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">ROI</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  results.hasOwnCosts ? marginTone(results.roi) : "text-muted-foreground"
                )}
              >
                {results.hasOwnCosts ? `${results.roi.toFixed(1)}%` : "—"}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
