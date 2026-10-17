// US FBA fulfillment fee estimator (non-apparel, non-dangerous goods).
// Snapshot of Amazon's published US rate card — revise here when Amazon
// updates fees. Inputs in inches and pounds.

export interface FbaEstimate {
  fee: number;
  tier: string;
}

export function estimateFbaFeeUS(
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  weightLb: number
): FbaEstimate | null {
  if (!lengthIn || !widthIn || !heightIn || !weightLb) return null;
  const [l, w, h] = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
  const oz = weightLb * 16;

  // Small standard: ≤ 15 x 12 x 0.75 in and ≤ 16 oz (unit weight).
  if (l <= 15 && w <= 12 && h <= 0.75 && oz <= 16) {
    const brackets: [number, number][] = [
      [2, 3.06],
      [4, 3.15],
      [6, 3.24],
      [8, 3.33],
      [10, 3.43],
      [12, 3.53],
      [14, 3.6],
      [16, 3.65],
    ];
    const fee = brackets.find(([maxOz]) => oz <= maxOz)?.[1] ?? 3.65;
    return { fee, tier: "Small standard" };
  }

  // Dimensional weight applies from here (divisor 139).
  const dimWeight = (l * w * h) / 139;
  const shipLb = Math.max(weightLb, dimWeight);

  // Large standard: ≤ 18 x 14 x 8 in and ≤ 20 lb.
  if (l <= 18 && w <= 14 && h <= 8 && weightLb <= 20) {
    const shipOz = shipLb * 16;
    const brackets: [number, number][] = [
      [4, 3.68],
      [8, 3.9],
      [12, 4.15],
      [16, 4.55],
      [20, 4.99],
      [24, 5.37],
      [28, 5.52],
      [32, 5.77],
      [36, 5.87],
      [40, 6.05],
      [44, 6.21],
      [48, 6.62],
    ];
    const bracket = brackets.find(([maxOz]) => shipOz <= maxOz);
    if (bracket) return { fee: bracket[1], tier: "Large standard" };
    // Above 3 lb: base + $0.08 per 4 oz interval over 3 lb.
    const intervals = Math.ceil((shipOz - 48) / 4);
    return {
      fee: Math.round((6.92 + intervals * 0.08) * 100) / 100,
      tier: "Large standard",
    };
  }

  // Large bulky: ≤ 59 x 33 x 33 in, ≤ 50 lb, girth ≤ 130 in.
  const girth = l + 2 * (w + h);
  if (l <= 59 && w <= 33 && h <= 33 && weightLb <= 50 && girth <= 130) {
    const fee = 9.61 + Math.max(0, Math.ceil(shipLb) - 1) * 0.38;
    return { fee: Math.round(fee * 100) / 100, tier: "Large bulky" };
  }

  // Extra-large tiers vary a lot — don't guess.
  return null;
}
