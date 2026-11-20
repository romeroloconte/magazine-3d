import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPiece } from "@/lib/pieces";
import { getBookData } from "@/lib/bookData";
import { describe } from "@/lib/layouts";
import { Magazine } from "@/components/Magazine";

type Props = { params: Promise<{ slug: string }> };

/* Each piece has its own URL, title, description and link preview */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [found, data] = await Promise.all([getPublishedPiece(slug), getBookData()]);
  if (!found) return {};
  const { piece } = found;
  const title = `${piece.title.replace(/\n/g, " ")} · ${data.title}`;
  const description = describe(piece, data.title);
  return {
    title: { absolute: title },
    description,
    authors: [{ name: piece.credit || data.author }],
    alternates: { canonical: `/${slug}` },
    openGraph: { title, description, type: "article", siteName: data.title, url: `/${slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

/* The magazine, opened at this piece's spread */
export default async function PiecePage({ params }: Props) {
  const { slug } = await params;
  const [found, data] = await Promise.all([getPublishedPiece(slug), getBookData()]);
  if (!found) notFound();
  return <Magazine data={data} pieces={found.pieces} current={found.piece} />;
}
