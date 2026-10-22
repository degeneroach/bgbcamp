import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RevenueDaily } from "@/types/database";

// Revenue sources shown on the Tools → Revenue dashboard. Shopify NONNA is
// live; Amazon waits on SP-API developer approval.
export const SHOPIFY_NONNA_SOURCE = "shopify_nonna";
export const AMAZON_NONNA_SOURCE = "amazon_nonna";

const TIMEZONE = "America/Vancouver";
const SYNC_STALE_MS = 10 * 60 * 1000; // live-refresh today at most every 10 min
const BACKFILL_DAYS = 30;

export function shopifyNonnaConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_NONNA_DOMAIN && process.env.SHOPIFY_NONNA_ADMIN_TOKEN);
}

export function amazonNonnaConfigured(): boolean {
  return Boolean(
    process.env.AMAZON_LWA_CLIENT_ID &&
      process.env.AMAZON_LWA_CLIENT_SECRET &&
      process.env.AMAZON_REFRESH_TOKEN &&
      process.env.AMAZON_MARKETPLACE_ID
  );
}

// "YYYY-MM-DD" for a date as seen from Vancouver, plus that calendar day's
// start/end instants in Shopify query format (local time + UTC offset).
function vancouverDay(daysAgo: number): { date: string; start: string; end: string } {
  const now = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(now);
  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT-7"
  const m = offsetPart?.match(/GMT([+-]\d+)(?::(\d+))?/);
  const hours = m ? parseInt(m[1], 10) : -8;
  const offset = `${hours < 0 ? "-" : "+"}${String(Math.abs(hours)).padStart(2, "0")}:${m?.[2] ?? "00"}`;
  const next = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date(now.getTime() + 24 * 60 * 60 * 1000)
  );
  return {
    date: ymd,
    start: `${ymd}T00:00:00${offset}`,
    end: `${next}T00:00:00${offset}`,
  };
}

interface DayTotal {
  revenue: number;
  orders: number;
  currency: string;
}

// Sums one Vancouver calendar day of real (non-test, non-cancelled) orders
// via the Admin GraphQL API. Totals are what customers paid, incl. tax and
// shipping, minus refunds Shopify has already applied to the order total.
async function fetchShopifyDay(start: string, end: string): Promise<DayTotal> {
  const domain = process.env.SHOPIFY_NONNA_DOMAIN!;
  const token = process.env.SHOPIFY_NONNA_ADMIN_TOKEN!;
  const query = `created_at:>='${start}' AND created_at:<'${end}'`;

  let revenue = 0;
  let orders = 0;
  let currency = "CAD";
  let after: string | null = null;

  for (let page = 0; page < 5; page++) {
    const res: Response = await fetch(`https://${domain}/admin/api/2025-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query: `
          query DayOrders($q: String!, $after: String) {
            orders(first: 250, query: $q, after: $after) {
              pageInfo { hasNextPage endCursor }
              nodes {
                test
                cancelledAt
                currentTotalPriceSet { shopMoney { amount currencyCode } }
              }
            }
          }`,
        variables: { q: query, after },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Shopify ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`Shopify: ${JSON.stringify(json.errors).slice(0, 200)}`);

    const conn = json.data.orders;
    for (const node of conn.nodes) {
      if (node.test || node.cancelledAt) continue;
      const money = node.currentTotalPriceSet?.shopMoney;
      if (!money) continue;
      revenue += parseFloat(money.amount);
      orders += 1;
      currency = money.currencyCode ?? currency;
    }
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }

  return { revenue: Math.round(revenue * 100) / 100, orders, currency };
}

// Refreshes today + yesterday (yesterday so late-evening orders get their
// final number), and backfills ~30 days the first time the source syncs.
// Throws on Shopify errors — callers decide how loudly to surface that.
export async function syncShopifyNonna(organizationId: string): Promise<void> {
  if (!shopifyNonnaConfigured()) return;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("revenue_daily")
    .select("date, updated_at")
    .eq("organization_id", organizationId)
    .eq("source", SHOPIFY_NONNA_SOURCE)
    .order("date", { ascending: false })
    .limit(2);

  const today = vancouverDay(0);
  const todayRow = (existing ?? []).find((r) => r.date === today.date);
  const fresh = todayRow && Date.now() - Date.parse(todayRow.updated_at) < SYNC_STALE_MS;
  if (fresh) return;

  const days = (existing ?? []).length === 0
    ? Array.from({ length: BACKFILL_DAYS }, (_, i) => vancouverDay(i))
    : [today, vancouverDay(1)];

  for (const day of days) {
    const total = await fetchShopifyDay(day.start, day.end);
    await admin.from("revenue_daily").upsert(
      {
        organization_id: organizationId,
        date: day.date,
        source: SHOPIFY_NONNA_SOURCE,
        revenue: total.revenue,
        orders: total.orders,
        currency: total.currency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,date,source" }
    );
  }
}

// Login-with-Amazon token exchange — SP-API needs only this (no AWS SigV4
// since late 2023).
async function lwaAccessToken(): Promise<string> {
  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.AMAZON_REFRESH_TOKEN!,
      client_id: process.env.AMAZON_LWA_CLIENT_ID!,
      client_secret: process.env.AMAZON_LWA_CLIENT_SECRET!,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Amazon login ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

// One Sales API getOrderMetrics call returns per-day totals for the whole
// window — ordered product sales (excl. tax) and order counts.
export async function syncAmazonNonna(organizationId: string): Promise<void> {
  if (!amazonNonnaConfigured()) return;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("revenue_daily")
    .select("date, updated_at")
    .eq("organization_id", organizationId)
    .eq("source", AMAZON_NONNA_SOURCE)
    .order("date", { ascending: false })
    .limit(2);

  const today = vancouverDay(0);
  const todayRow = (existing ?? []).find((r) => r.date === today.date);
  const fresh = todayRow && Date.now() - Date.parse(todayRow.updated_at) < SYNC_STALE_MS;
  if (fresh) return;

  const windowDays = (existing ?? []).length === 0 ? BACKFILL_DAYS : 2;
  const start = vancouverDay(windowDays - 1).start;
  const end = today.end;
  const token = await lwaAccessToken();

  const params = new URLSearchParams({
    marketplaceIds: process.env.AMAZON_MARKETPLACE_ID!,
    interval: `${start}--${end}`,
    granularity: "Day",
    granularityTimeZone: TIMEZONE,
  });
  const res = await fetch(
    `https://sellingpartnerapi-na.amazon.com/sales/v1/orderMetrics?${params}`,
    { headers: { "x-amz-access-token": token }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Amazon ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();

  const metrics: {
    interval: string;
    orderCount: number;
    totalSales: { amount: string | number; currencyCode: string };
  }[] = json.payload ?? [];

  for (const m of metrics) {
    const date = m.interval.slice(0, 10);
    await admin.from("revenue_daily").upsert(
      {
        organization_id: organizationId,
        date,
        source: AMAZON_NONNA_SOURCE,
        revenue: Math.round(Number(m.totalSales?.amount ?? 0) * 100) / 100,
        orders: m.orderCount ?? 0,
        currency: m.totalSales?.currencyCode ?? "CAD",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,date,source" }
    );
  }
}

export async function getRevenueRows(organizationId: string): Promise<RevenueDaily[]> {
  const admin = createAdminClient();
  const since = vancouverDay(BACKFILL_DAYS - 1).date;
  const { data } = await admin
    .from("revenue_daily")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("date", since)
    .order("date", { ascending: false });
  return (data ?? []) as RevenueDaily[];
}

export function todayVancouver(): string {
  return vancouverDay(0).date;
}

export function yesterdayVancouver(): string {
  return vancouverDay(1).date;
}
