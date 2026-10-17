import { ExternalLink } from "lucide-react";
import { AmazonMarginsCalculator } from "@/components/amazon-margins-calculator";
import { requireCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { MarginCalc } from "@/types/database";

export const metadata = {
  title: "Amazon Margins · BGBCamp",
};

export default async function AmazonMarginsPage() {
  const { organization } = await requireCurrentUser();
  const supabase = await createClient();
  const { data: saved } = await supabase
    .from("margin_calcs")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Amazon Margins</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimate FBA profitability per product.
        </p>
        <a
          href="https://sellercentral.amazon.com/revcalpublic?lang=en_US"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Amazon&apos;s official calculator
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <AmazonMarginsCalculator saved={(saved ?? []) as MarginCalc[]} />
    </div>
  );
}
