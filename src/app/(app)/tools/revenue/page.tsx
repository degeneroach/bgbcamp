import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import {
  AMAZON_NONNA_SOURCE,
  SHOPIFY_NONNA_SOURCE,
  amazonNonnaConfigured,
  getRevenueRows,
  shopifyNonnaConfigured,
  syncAmazonNonna,
  syncShopifyNonna,
  todayVancouver,
  yesterdayVancouver,
} from "@/lib/revenue";
import { RevenueRefresh } from "@/components/revenue-refresh";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShoppingBag, Package, TrendingUp, TrendingDown } from "lucide-react";
import type { RevenueDaily } from "@/types/database";

export const metadata = {
  title: "Revenue · BGBCamp",
};

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
}

export default async function RevenuePage() {
  const { role, organization } = await requireCurrentUser();
  if (role !== "owner" && role !== "admin") notFound();

  // Each source syncs (and fails) independently, so one bad API never
  // blanks the other's numbers.
  const syncErrors: string[] = [];
  const [shopSync, amazonSync] = await Promise.allSettled([
    syncShopifyNonna(organization.id),
    syncAmazonNonna(organization.id),
  ]);
  if (shopSync.status === "rejected")
    syncErrors.push(`Shopify: ${shopSync.reason instanceof Error ? shopSync.reason.message : "sync failed"}`);
  if (amazonSync.status === "rejected")
    syncErrors.push(`Amazon: ${amazonSync.reason instanceof Error ? amazonSync.reason.message : "sync failed"}`);

  const rows = await getRevenueRows(organization.id);
  const shopRows = rows.filter((r) => r.source === SHOPIFY_NONNA_SOURCE);
  const amazonRows = rows.filter((r) => r.source === AMAZON_NONNA_SOURCE);

  const today = todayVancouver();
  const yesterday = yesterdayVancouver();
  const shopToday = shopRows.find((r) => r.date === today);
  const shopYesterday = shopRows.find((r) => r.date === yesterday);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            NONNA sales, straight from the source. Admin eyes only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {shopToday && (
            <span className="text-xs text-muted-foreground">
              Updated {timeAgo(shopToday.updated_at)}
            </span>
          )}
          <RevenueRefresh />
        </div>
      </div>

      {syncErrors.length > 0 && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Sync hit a snag (showing last saved numbers): {syncErrors.join(" · ")}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SourceTile
          label="NONNA · Shopify"
          icon={<ShoppingBag className="h-4 w-4" />}
          configured={shopifyNonnaConfigured()}
          todayRow={shopToday}
          yesterdayRow={shopYesterday}
          notConfiguredHint="Add the Shopify access token in Vercel to connect this store."
        />
        <SourceTile
          label="NONNA · Amazon"
          icon={<Package className="h-4 w-4" />}
          configured={amazonNonnaConfigured() || amazonRows.length > 0}
          todayRow={amazonRows.find((r) => r.date === today)}
          yesterdayRow={amazonRows.find((r) => r.date === yesterday)}
          notConfiguredHint="Waiting on the Amazon app keys — this tile lights up once they're in Vercel."
        />
      </div>

      <DailyChart rows={shopRows} />
    </div>
  );
}

function SourceTile({
  label,
  icon,
  configured,
  todayRow,
  yesterdayRow,
  notConfiguredHint,
}: {
  label: string;
  icon: React.ReactNode;
  configured: boolean;
  todayRow: RevenueDaily | undefined;
  yesterdayRow: RevenueDaily | undefined;
  notConfiguredHint: string;
}) {
  const currency = todayRow?.currency ?? yesterdayRow?.currency ?? "CAD";
  const revenue = todayRow?.revenue ?? 0;
  const prev = yesterdayRow?.revenue ?? 0;
  const delta = prev > 0 ? ((revenue - prev) / prev) * 100 : null;
  const up = delta !== null && delta >= 0;

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
        {!configured && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Not connected
          </span>
        )}
      </div>
      {configured ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums tracking-tight">
              {money(revenue, currency)}
            </span>
            <span className="text-sm text-muted-foreground">today</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              {todayRow?.orders ?? 0} {todayRow?.orders === 1 ? "order" : "orders"}
            </span>
            <span>Yesterday: {money(prev, currency)}</span>
            {delta !== null && (
              <span
                className={cn(
                  "flex items-center gap-1 font-medium",
                  up ? "text-success" : "text-destructive"
                )}
              >
                {up ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(delta).toFixed(0)}%
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{notConfiguredHint}</p>
      )}
    </Card>
  );
}

// Last-14-days bar strip. Totals include tax & shipping, minus refunds
// already applied to orders.
function DailyChart({ rows }: { rows: RevenueDaily[] }) {
  const days = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
  if (days.length === 0) return null;

  const currency = days[days.length - 1].currency;
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const total = days.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Shopify · last {days.length} days
        </span>
        <span className="text-sm font-medium tabular-nums">{money(total, currency)}</span>
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {days.map((d) => (
          <div
            key={d.date}
            className="group flex min-w-0 flex-1 flex-col items-center gap-1 self-stretch justify-end"
            title={`${d.date}: ${money(d.revenue, d.currency)} · ${d.orders} orders`}
          >
            <div
              className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max(3, (d.revenue / max) * 100)}%` }}
            />
            <span className="text-[9px] tabular-nums text-muted-foreground/60">
              {d.date.slice(8)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/70">
        Totals are what customers paid (incl. tax &amp; shipping), excluding test and
        cancelled orders. Days roll over at midnight Pacific.
      </p>
    </Card>
  );
}
