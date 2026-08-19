import { GolfTownCalculator } from "@/components/golf-town-calculator";

export const metadata = {
  title: "Golf Town Invoice · BGBCamp",
};

export default function GolfTownPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Golf Town Invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Distributor reseller pricing — what Golf Town owes us for a print run,
          before GST / taxes.
        </p>
      </div>

      <GolfTownCalculator />
    </div>
  );
}
