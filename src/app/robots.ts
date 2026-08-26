import type { MetadataRoute } from "next";

// Keep the Golf Town portal out of search engines (it also carries a
// noindex meta tag belt-and-suspenders).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/golftown",
    },
  };
}
