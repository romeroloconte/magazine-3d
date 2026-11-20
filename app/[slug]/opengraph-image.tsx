import { getBookData } from "@/lib/bookData";
import { getPublishedPiece } from "@/lib/pieces";
import { ogImage, OG_SIZE } from "@/lib/ogImage";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Magazine piece";

/* Link preview for a piece: its title, in its own page colors */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [d, found] = await Promise.all([getBookData(), getPublishedPiece(slug)]);
  const p = found?.piece;
  return ogImage({
    masthead: d.title,
    title: p?.title ?? d.title,
    line: p ? `${p.label || p.layout} — ${p.credit || d.author}` : `Magazine ${d.issue}`,
    background: p?.background || d.pageColor,
    ink: p?.ink || d.pageInk,
  });
}
