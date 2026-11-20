import type { Metadata } from "next";
import { getPublishedPieces } from "@/lib/pieces";
import { getBookData } from "@/lib/bookData";
import { Magazine } from "@/components/Magazine";

/* Title, description and link previews come from the magazine settings */
export async function generateMetadata(): Promise<Metadata> {
  const [data, pieces] = await Promise.all([getBookData(), getPublishedPieces()]);
  const names = [...new Set(pieces.map((p) => p.credit || data.author))].slice(0, 6).join(", ");
  const title = `${data.title} · Magazine ${data.issue}`;
  const description = `${data.title}, issue ${data.issue} (${data.year}).${names ? ` Featuring ${names}.` : ""}`;
  return {
    title: { absolute: title },
    description,
    authors: [{ name: data.author }],
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "website", siteName: data.title, url: "/" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/* The magazine, opened at the cover */
export default async function Home() {
  const [data, pieces] = await Promise.all([getBookData(), getPublishedPieces()]);
  return <Magazine data={data} pieces={pieces} />;
}
