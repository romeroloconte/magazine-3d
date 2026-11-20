import type { MetadataRoute } from "next";
import { getPublishedPieces } from "@/lib/pieces";
import { SITE_URL } from "@/lib/site";

/* The cover plus one URL per published piece */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pieces = await getPublishedPieces();
  return [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...pieces.map((p) => ({ url: `${SITE_URL}/${p.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
