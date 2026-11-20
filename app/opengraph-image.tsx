import { getBookData } from "@/lib/bookData";
import { ogImage, OG_SIZE } from "@/lib/ogImage";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Magazine cover";

/* Link preview for the home page: the cover, in the cover colors */
export default async function Image() {
  const d = await getBookData();
  return ogImage({
    masthead: d.title,
    title: d.headline || d.title,
    line: `Magazine ${d.issue} — ${d.year}`,
    background: d.coverColor,
    ink: d.coverInk,
  });
}
