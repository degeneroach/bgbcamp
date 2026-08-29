import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { DextDrop } from "@/components/dext-drop";

export const metadata = {
  title: "Dext Drop · BGBCamp",
};

export default async function DextPage() {
  const { role } = await requireCurrentUser();
  if (role !== "owner" && role !== "admin") notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dext Drop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop invoices and receipts — they're emailed straight into the right
          Dext account. No signing in, no account switching.
        </p>
      </div>

      <DextDrop />
    </div>
  );
}
