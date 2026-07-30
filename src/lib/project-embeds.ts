// Extra per-project tabs that embed an external tool (Google Sheets etc.).
// Keyed by project slug; each entry becomes a tab on that project. Adding a
// new embed is just another row here.
export interface ProjectEmbed {
  /** URL segment for the tab, e.g. "shipments" -> /projects/<slug>/embed/shipments */
  id: string;
  label: string;
  /** The iframe src. For Google Sheets use the /edit?rm=minimal form. */
  src: string;
  /** "Open in ..." link target (usually the same doc, full UI). */
  openUrl: string;
}

export const PROJECT_EMBEDS: Record<string, ProjectEmbed[]> = {
  "biodegradable-golf-balls": [
    {
      id: "shipments",
      label: "On-Going Shipments",
      src: "https://docs.google.com/spreadsheets/d/14YqGnjNnw_OO2XO4ya3ffgF7AJhh5-eMfdWaVoSHFug/edit?rm=minimal",
      openUrl:
        "https://docs.google.com/spreadsheets/d/14YqGnjNnw_OO2XO4ya3ffgF7AJhh5-eMfdWaVoSHFug/edit",
    },
  ],
};

export function getProjectEmbeds(slug: string): ProjectEmbed[] {
  return PROJECT_EMBEDS[slug] ?? [];
}
