// Shared currency helpers for the margins calculator. Rates are expressed
// as units per 1 USD and fetched server-side (ECB daily via frankfurter);
// these fallbacks only kick in if that fetch fails.

export type FxRates = Record<string, number>;

export const MARKETPLACE_CURRENCY: Record<string, string> = {
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  UK: "GBP",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  JP: "JPY",
  AU: "AUD",
};

// Marketplaces where the listing price INCLUDES sales tax that Amazon
// collects and remits for overseas sellers (VAT/GST/IVA/consumption tax).
// US/CA are 0: tax there is added on top of the listed price.
export const MARKETPLACE_VAT: Record<string, number> = {
  US: 0,
  CA: 0,
  MX: 16,
  UK: 20,
  DE: 19,
  FR: 20,
  IT: 22,
  ES: 21,
  JP: 10,
  AU: 10,
};

export const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  CAD: "$",
  MXN: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  AUD: "$",
};

export const FALLBACK_RATES: FxRates = {
  USD: 1,
  CAD: 1.37,
  MXN: 18.6,
  GBP: 0.78,
  EUR: 0.9,
  JPY: 152,
  AUD: 1.5,
};

export function marketplaceCurrency(marketplace: string): string {
  return MARKETPLACE_CURRENCY[marketplace] ?? "USD";
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: FxRates
): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}
