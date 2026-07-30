import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getProjectEmbeds } from "@/lib/project-embeds";
import { Button } from "@/components/ui/button";

export default async function ProjectEmbedPage({
  params,
}: {
  params: Promise<{ slug: string; embedId: string }>;
}) {
  const { slug, embedId } = await params;
  const embed = getProjectEmbeds(slug).find((e) => e.id === embedId);
  if (!embed) notFound();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Embedded from Google Sheets — you may need to be signed in to your Google
          account to see it.
        </p>
        <Button
          variant="outline"
          size="sm"
          render={
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            <a href={embed.openUrl} target="_blank" rel="noreferrer" />
          }
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Google Sheets
        </Button>
      </div>
      <iframe
        src={embed.src}
        title={embed.label}
        className="h-[75vh] w-full rounded-xl border bg-white"
        allow="clipboard-write"
      />
    </div>
  );
}
