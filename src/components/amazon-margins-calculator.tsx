"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
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
import { estimateFbaFeeUS } from "@/lib/fba-fees";
import {
  CURRENCY_SYMBOL,
  convertCurrency,
  marketplaceCurrency,
  type FxRates,
} from "@/lib/currency";
import { saveMarginCalc, deleteMarginCalc } from "@/app/(app)/tools/amazon-margins/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MarginCalc } from "@/types/database";

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

// Amazon brand-registry trademarks products get filed under.
const BRANDS = [
  { value: "EverySwing Golf", class: "border-sky-500/50 bg-sky-500/10 text-sky-400" },
  { value: "Biodegradable Golf Balls", class: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" },
  { value: "NONNA", class: "border-amber-500/50 bg-amber-500/10 text-amber-400" },
];

/** Parse a money/number field: empty -> 0, negatives clamp to 0. */
function num(value: string): number {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function money(value: number, currency = "USD"): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "";
  const digits = currency === "JPY" ? 0 : 2;
  return `${symbol}${value.toFixed(digits)}`;
}

function MoneyInput({
  id,
  value,
  onChange,
  placeholder = "0.00",
  symbol = "$",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  symbol?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {symbol}
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

// Recomputes a saved product's headline numbers from its stored inputs,
// mirroring the live calculator (FBA auto-estimate and landed-cost
// currency conversion included). Money values are in the marketplace's
// currency.
function computeSnapshot(d: Record<string, string>, rates: FxRates) {
  const metric = d.unitSystem === "metric";
  const toIn = (v: number) => (metric ? v / 2.54 : v);
  const toLb = (v: number) => (metric ? v * 2.20462 : v);
  const isFbm = d.fulfillment === "FBM";
  const marketCur = marketplaceCurrency(d.marketplace || "US");
  const costCur = d.costCurrency || marketCur;
  const toMarket = (v: number) => convertCurrency(v, costCur, marketCur, rates);
  const usEstimate = estimateFbaFeeUS(
    toIn(num(d.length ?? "")), toIn(num(d.width ?? "")), toIn(num(d.height ?? "")), toLb(num(d.weight ?? ""))
  );
  const estimatedFee = usEstimate
    ? convertCurrency(usEstimate.fee, "USD", marketCur, rates)
    : 0;
  const effFba = isFbm
    ? 0
    : (d.fbaFee ?? "").trim() !== "" ? num(d.fbaFee) : estimatedFee;
  const priceN = num(d.price ?? "");
  const revenue = priceN + num(d.shippingCharge ?? "");
  const referralFee =
    (d.referralMode || "percent") === "percent"
      ? priceN * (num(d.referralValue ?? "15") / 100)
      : num(d.referralValue ?? "");
  const totalCost =
    toMarket(num(d.cogs ?? "") + num(d.inbound ?? "") + num(d.otherCosts ?? "") +
      (isFbm ? num(d.fbmShipping ?? "") : 0)) +
    referralFee + effFba +
    (isFbm ? 0 : num(d.storageFee ?? ""));
  // Saved rows show profit AFTER average TACOS ad spend — the true number.
  const adSpend = revenue * (num(d.tacos ?? "") / 100);
  const netProfit = revenue - totalCost - adSpend;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return { price: priceN, netProfit, netMargin, currency: marketCur };
}

// Small pill row for picking a currency (e.g. CAD / USD / £ GBP).
function CurrencyChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (currency: string) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border">
      {options.map((cur) => (
        <button
          key={cur}
          type="button"
          aria-pressed={value === cur}
          onClick={() => onChange(cur)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors",
            value === cur
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {cur}
        </button>
      ))}
    </div>
  );
}

// Inline price editor in the saved-products table: type, then Enter or
// click away to save. Remounted via key when the server value changes.
function InlinePriceInput({
  calc,
  onSaved,
  symbol = "$",
}: {
  calc: MarginCalc;
  onSaved: (price: string) => void;
  symbol?: string;
}) {
  const [value, setValue] = useState(calc.data.price ?? "");
  const [isPending, startTransition] = useTransition();

  function commit() {
    const v = value.trim();
    if (v === (calc.data.price ?? "").trim()) return;
    startTransition(async () => {
      const result = await saveMarginCalc({
        id: calc.id,
        name: calc.name,
        sku: calc.sku,
        data: { ...calc.data, price: v },
      });
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't save the price.");
        setValue(calc.data.price ?? "");
        return;
      }
      toast.success(`Price updated for ${calc.name}.`);
      onSaved(v);
    });
  }

  return (
    <div
      className="relative w-20 shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {symbol}
      </span>
      <input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        placeholder="0.00"
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setValue(calc.data.price ?? "");
        }}
        className="h-7 w-full rounded-md border bg-background pl-4 pr-1.5 text-right text-xs tabular-nums outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        aria-label={`Price for ${calc.name}`}
      />
    </div>
  );
}

// Margin traffic lights: >30% healthy green, 20–30% yellow, 0–20% orange,
// losing money red.
function marginTone(pct: number): string {
  if (pct > 30) return "text-success";
  if (pct >= 20) return "text-yellow-500 dark:text-yellow-400";
  if (pct >= 0) return "text-orange-500 dark:text-orange-400";
  return "text-destructive";
}

export function AmazonMarginsCalculator({
  saved = [],
  rates,
}: {
  saved?: MarginCalc[];
  rates: FxRates;
}) {
  // Product
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
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
  const [fulfillment, setFulfillment] = useState<"FBA" | "FBM">("FBA");
  // Currency the landed costs (COGS, inbound, other, FBM shipping) are
  // entered in; converted to the marketplace currency for the margin math.
  const [costCurrency, setCostCurrency] = useState("USD");
  // Currency the Results card displays in.
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [cogs, setCogs] = useState("");
  const [inbound, setInbound] = useState("");
  const [fbmShipping, setFbmShipping] = useState("");
  const [referralMode, setReferralMode] = useState<"percent" | "flat">("percent");
  const [referralValue, setReferralValue] = useState("15");
  const [fbaFee, setFbaFee] = useState("");
  const [storageFee, setStorageFee] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  // Average TACOS (total ad spend ÷ total revenue, %): applied to revenue
  // to show profit after advertising.
  const [tacos, setTacos] = useState("");

  const [flash, setFlash] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const lengthSuffix = unitSystem === "imperial" ? "in" : "cm";
  const weightSuffix = unitSystem === "imperial" ? "lb" : "kg";

  const marketCur = marketplaceCurrency(marketplace);
  const marketSym = CURRENCY_SYMBOL[marketCur] ?? "$";
  const costCurrencyOptions = Array.from(new Set(["CAD", "USD", marketCur]));
  const displayCurrencyOptions = Array.from(new Set([marketCur, "CAD", "USD"]));

  // Marketplace change re-anchors both currency pickers to that market.
  function changeMarketplace(next: string) {
    setMarketplace(next);
    const cur = marketplaceCurrency(next);
    setDisplayCurrency(cur);
    setCostCurrency((prev) => (["CAD", "USD", cur].includes(prev) ? prev : cur));
  }

  // Estimated FBA fulfillment fee from the size/weight fields (metric
  // converted). Based on the US fee table; for other marketplaces the USD
  // fee converts to local currency as a rough guide. Used automatically
  // when the FBA fee field is left blank.
  const fbaEstimate = useMemo(() => {
    const toIn = (v: number) => (unitSystem === "imperial" ? v : v / 2.54);
    const toLb = (v: number) => (unitSystem === "imperial" ? v : v * 2.20462);
    const est = estimateFbaFeeUS(
      toIn(num(length)),
      toIn(num(width)),
      toIn(num(height)),
      toLb(num(weight))
    );
    if (!est) return null;
    return {
      ...est,
      fee: convertCurrency(est.fee, "USD", marketCur, rates),
      approximate: marketCur !== "USD",
    };
  }, [unitSystem, length, width, height, weight, marketCur, rates]);

  const effectiveFbaFee =
    fulfillment === "FBM" ? 0 : fbaFee.trim() !== "" ? num(fbaFee) : fbaEstimate?.fee ?? 0;

  // All math happens in the marketplace currency: landed costs convert from
  // costCurrency first, so the margin is real even when you buy in USD/CAD
  // and sell in £/€/¥.
  const results = useMemo(() => {
    const priceN = num(price);
    const revenue = priceN + num(shippingCharge);
    const referralFee =
      referralMode === "percent" ? priceN * (num(referralValue) / 100) : num(referralValue);
    const amazonFees =
      referralFee + effectiveFbaFee + (fulfillment === "FBM" ? 0 : num(storageFee));
    const ownCosts = convertCurrency(
      num(cogs) + num(inbound) + num(otherCosts) +
        (fulfillment === "FBM" ? num(fbmShipping) : 0),
      costCurrency,
      marketCur,
      rates
    );
    const totalCost = ownCosts + amazonFees;
    const netProfit = revenue - totalCost;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const roi = ownCosts > 0 ? (netProfit / ownCosts) * 100 : 0;
    const tacosPct = num(tacos);
    const adSpend = revenue * (tacosPct / 100);
    const profitAfterAds = netProfit - adSpend;
    const marginAfterAds = revenue > 0 ? (profitAfterAds / revenue) * 100 : 0;
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
      tacosPct,
      adSpend,
      profitAfterAds,
      marginAfterAds,
    };
  }, [price, shippingCharge, referralMode, referralValue, effectiveFbaFee, storageFee, cogs, inbound, otherCosts, fulfillment, fbmShipping, costCurrency, marketCur, rates, tacos]);

  // Full input set, saved/loaded as one blob.
  function snapshot(): Record<string, string> {
    return {
      brand: brand ?? "",
      marketplace,
      category: category ?? "",
      unitSystem,
      fulfillment,
      costCurrency,
      length, width, height, weight,
      price, shippingCharge,
      cogs, inbound, fbmShipping,
      referralMode, referralValue,
      fbaFee, storageFee, otherCosts,
      tacos,
    };
  }

  function loadCalc(calc: MarginCalc) {
    const d = calc.data;
    setLoadedId(calc.id);
    setProductName(calc.name);
    setSku(calc.sku);
    setBrand(d.brand || null);
    setMarketplace(d.marketplace || "US");
    setCategory(d.category || null);
    setUnitSystem((d.unitSystem as "imperial" | "metric") || "imperial");
    setFulfillment(d.fulfillment === "FBM" ? "FBM" : "FBA");
    setFbmShipping(d.fbmShipping ?? "");
    const loadedCur = marketplaceCurrency(d.marketplace || "US");
    setCostCurrency(d.costCurrency || loadedCur);
    setDisplayCurrency(loadedCur);
    setLength(d.length ?? "");
    setWidth(d.width ?? "");
    setHeight(d.height ?? "");
    setWeight(d.weight ?? "");
    setPrice(d.price ?? "");
    setShippingCharge(d.shippingCharge ?? "");
    setCogs(d.cogs ?? "");
    setInbound(d.inbound ?? "");
    setReferralMode((d.referralMode as "percent" | "flat") || "percent");
    setReferralValue(d.referralValue ?? "15");
    setFbaFee(d.fbaFee ?? "");
    setStorageFee(d.storageFee ?? "");
    setOtherCosts(d.otherCosts ?? "");
    setTacos(d.tacos ?? "");
  }

  function resetCalc() {
    setLoadedId(null);
    setProductName("");
    setSku("");
    setBrand(null);
    setCategory(null);
    setLength(""); setWidth(""); setHeight(""); setWeight("");
    setPrice(""); setShippingCharge("");
    setFulfillment("FBA");
    setCostCurrency(marketplaceCurrency(marketplace));
    setDisplayCurrency(marketplaceCurrency(marketplace));
    setCogs(""); setInbound(""); setFbmShipping("");
    setReferralMode("percent"); setReferralValue("15");
    setFbaFee(""); setStorageFee(""); setOtherCosts("");
    setTacos("");
  }

  function handleSave() {
    startSaving(async () => {
      const result = await saveMarginCalc({
        id: loadedId,
        name: productName,
        sku,
        data: snapshot(),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't save.");
        return;
      }
      if (result.id) setLoadedId(result.id);
      toast.success(loadedId ? "Product updated." : "Product saved.");
      router.refresh();
    });
  }

  function handleDeleteSaved() {
    if (!loadedId) return;
    if (!window.confirm(`Delete the saved product "${productName}"?`)) return;
    startSaving(async () => {
      const result = await deleteMarginCalc(loadedId);
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't delete.");
        return;
      }
      resetCalc();
      router.refresh();
    });
  }

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
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Product</SectionLabel>
            {saved.length > 0 && (
              <Select
                items={Object.fromEntries(
                  saved.map((c) => [c.id, c.sku ? `${c.name} · ${c.sku}` : c.name])
                )}
                value={loadedId}
                onValueChange={(id) => {
                  const calc = saved.find((c) => c.id === id);
                  if (calc) loadCalc(calc);
                }}
              >
                <SelectTrigger className="h-7 w-[220px] text-xs">
                  <SelectValue placeholder="Open saved product..." />
                </SelectTrigger>
                <SelectContent>
                  {saved.map((calc) => (
                    <SelectItem key={calc.id} value={calc.id}>
                      {calc.sku ? `${calc.name} · ${calc.sku}` : calc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="am-sku" className="text-xs text-muted-foreground">
              SKU
            </Label>
            <Input
              id="am-sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. NNA-POT-002"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Brand registry</Label>
            <div className="flex flex-wrap gap-1.5">
              {BRANDS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  aria-pressed={brand === b.value}
                  onClick={() => setBrand(brand === b.value ? null : b.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    brand === b.value ? b.class : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {b.value}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Marketplace</Label>
              <Select items={marketplaceItems} value={marketplace} onValueChange={(v) => v && changeMarketplace(v)}>
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

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Fulfillment</SectionLabel>
          <div className="flex w-fit overflow-hidden rounded-lg border">
            {(["FBA", "FBM"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={fulfillment === mode}
                onClick={() => setFulfillment(mode)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium transition-colors",
                  fulfillment === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {mode === "FBA" ? "FBA · Amazon ships" : "FBM · you ship"}
              </button>
            ))}
          </div>
        </div>

        {fulfillment === "FBA" && (
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
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Pricing</SectionLabel>
            <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {marketSym} {marketCur}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="am-price" className="text-xs text-muted-foreground">
                Item price
              </Label>
              <MoneyInput id="am-price" value={price} onChange={setPrice} symbol={marketSym} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Shipping charge</Label>
              <MoneyInput value={shippingCharge} onChange={setShippingCharge} symbol={marketSym} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>Costs</SectionLabel>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Landed costs in</span>
              <CurrencyChips
                options={costCurrencyOptions}
                value={costCurrency}
                onChange={setCostCurrency}
              />
            </div>
          </div>
          {costCurrency !== marketCur && (
            <p className="text-[11px] text-muted-foreground">
              Converting at 1 {costCurrency} ={" "}
              {convertCurrency(1, costCurrency, marketCur, rates).toFixed(3)} {marketCur}{" "}
              (ECB daily rate) — applies to cost of goods, inbound
              {fulfillment === "FBM" ? ", shipping to customer," : ""} and other costs.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Cost of goods</Label>
              <MoneyInput value={cogs} onChange={setCogs} symbol={CURRENCY_SYMBOL[costCurrency] ?? "$"} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Inbound shipping / unit</Label>
              <MoneyInput value={inbound} onChange={setInbound} symbol={CURRENCY_SYMBOL[costCurrency] ?? "$"} />
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
                    <MoneyInput value={referralValue} onChange={setReferralValue} symbol={marketSym} />
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
                      {mode === "percent" ? "%" : marketSym}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {fulfillment === "FBA" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">FBA fulfillment fee</Label>
                  <MoneyInput
                    value={fbaFee}
                    onChange={setFbaFee}
                    placeholder={fbaEstimate ? fbaEstimate.fee.toFixed(2) : "0.00"}
                    symbol={marketSym}
                  />
                  {fbaFee.trim() === "" && fbaEstimate && (
                    <p className="text-[11px] text-muted-foreground">
                      Auto: {money(fbaEstimate.fee, marketCur)} ({fbaEstimate.tier}, from
                      size/weight
                      {fbaEstimate.approximate ? ", US rates converted — rough guide" : ""}) —
                      type to override
                    </p>
                  )}
                  {fbaFee.trim() === "" && !fbaEstimate && (
                    <p className="text-[11px] text-muted-foreground">
                      Fill in dimensions &amp; weight to auto-estimate
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Storage fee / unit</Label>
                  <MoneyInput value={storageFee} onChange={setStorageFee} symbol={marketSym} />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Shipping to customer / unit
                </Label>
                <MoneyInput
                  value={fbmShipping}
                  onChange={setFbmShipping}
                  symbol={CURRENCY_SYMBOL[costCurrency] ?? "$"}
                />
                <p className="text-[11px] text-muted-foreground">
                  FBM: you ship it — no FBA fulfillment or storage fees, just the referral fee.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Other costs</Label>
              <MoneyInput
                value={otherCosts}
                onChange={setOtherCosts}
                symbol={CURRENCY_SYMBOL[costCurrency] ?? "$"}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Advertising</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Average TACOS</Label>
              <SuffixInput value={tacos} onChange={setTacos} suffix="%" />
              <p className="text-[11px] text-muted-foreground">
                Total ad spend ÷ total revenue — from your Amazon ads console. Results
                show profit after ads.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            {loadedId && (
              <button
                type="button"
                onClick={handleDeleteSaved}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete saved
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetCalc} disabled={isSaving}>
              <Plus className="h-4 w-4" />
              New
            </Button>
            <Button size="sm" className="rounded-full" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {loadedId ? "Save changes" : "Save product"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results. row-span-2 stretches its grid cell down past the saved
          list, so sticky keeps it pinned for the whole page scroll. */}
      <div className="lg:row-span-2 lg:self-stretch">
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
        ) : (() => {
          const disp = (v: number) => convertCurrency(v, marketCur, displayCurrency, rates);
          return (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Show in</span>
              <CurrencyChips
                options={displayCurrencyOptions}
                value={displayCurrency}
                onChange={setDisplayCurrency}
              />
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium tabular-nums">{money(disp(results.revenue), displayCurrency)}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Total Amazon fees</span>
              <span className="font-medium tabular-nums">−{money(disp(results.amazonFees), displayCurrency)}</span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Total cost</span>
              <span className="font-medium tabular-nums">−{money(disp(results.totalCost), displayCurrency)}</span>
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
                {results.netProfit < 0
                  ? `−${money(Math.abs(disp(results.netProfit)), displayCurrency)}`
                  : money(disp(results.netProfit), displayCurrency)}
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

            {results.tacosPct > 0 && (
              <>
                <div className="my-1 border-t" />
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">
                    Ad spend ({results.tacosPct}% TACOS)
                  </span>
                  <span className="font-medium tabular-nums">
                    −{money(disp(results.adSpend), displayCurrency)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Profit after ads</span>
                  <span
                    className={cn(
                      "text-xl font-semibold tabular-nums tracking-tight",
                      results.profitAfterAds < 0 && "text-destructive"
                    )}
                  >
                    {results.profitAfterAds < 0
                      ? `−${money(Math.abs(disp(results.profitAfterAds)), displayCurrency)}`
                      : money(disp(results.profitAfterAds), displayCurrency)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Margin after ads</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      marginTone(results.marginAfterAds)
                    )}
                  >
                    {results.marginAfterAds.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
            {displayCurrency !== marketCur && (
              <p className="text-[11px] text-muted-foreground">
                Converted from {marketCur} at 1 {marketCur} ={" "}
                {convertCurrency(1, marketCur, displayCurrency, rates).toFixed(3)}{" "}
                {displayCurrency} (ECB daily rate).
              </p>
            )}
          </div>
          );
        })()}
      </Card>
      </div>

      {/* Saved product library, grouped by brand registry. */}
      {saved.length > 0 && (
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-medium">Saved products</h2>
            <div className="flex items-center gap-3 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span className="min-w-0 flex-1">Product</span>
              <span className="w-20 shrink-0 text-right">Price</span>
              <span className="w-16 shrink-0 text-right">Profit</span>
              <span className="w-12 shrink-0 text-right">Margin</span>
              <span className="w-4 shrink-0" aria-hidden />
            </div>
          </div>
          {[...BRANDS.map((b) => b.value), ""].map((groupBrand) => {
            const group = saved.filter((c) => (c.data.brand ?? "") === groupBrand);
            if (group.length === 0) return null;
            const brandStyle = BRANDS.find((b) => b.value === groupBrand);
            return (
              <div key={groupBrand || "none"} className="flex flex-col gap-1.5">
                <span
                  className={cn(
                    "w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    brandStyle ? brandStyle.class : "text-muted-foreground"
                  )}
                >
                  {groupBrand || "No brand"}
                </span>
                <div className="flex flex-col divide-y rounded-lg border">
                  {group.map((calc) => {
                    const stats = computeSnapshot(calc.data, rates);
                    return (
                      <div
                        key={calc.id}
                        onClick={() => {
                          loadCalc(calc);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
                          loadedId === calc.id && "bg-accent/40"
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{calc.name}</span>
                          {calc.sku && (
                            <span className="ml-2 text-xs text-muted-foreground">{calc.sku}</span>
                          )}
                        </span>
                        <InlinePriceInput
                          key={`${calc.id}:${calc.data.price ?? ""}`}
                          calc={calc}
                          symbol={CURRENCY_SYMBOL[stats.currency] ?? "$"}
                          onSaved={(v) => {
                            if (loadedId === calc.id) setPrice(v);
                            router.refresh();
                          }}
                        />
                        <span
                          className={cn(
                            "w-16 shrink-0 text-right text-xs font-semibold tabular-nums",
                            stats.netProfit < 0 ? "text-destructive" : "text-foreground"
                          )}
                        >
                          {stats.netProfit < 0
                            ? `−${money(Math.abs(stats.netProfit), stats.currency)}`
                            : money(stats.netProfit, stats.currency)}
                        </span>
                        <span
                          className={cn(
                            "w-12 shrink-0 text-right text-xs font-semibold tabular-nums",
                            marginTone(stats.netMargin)
                          )}
                        >
                          {stats.netMargin.toFixed(0)}%
                        </span>
                        <Pencil className="h-3.5 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
