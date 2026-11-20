import Book from "@/components/Book";
import type { BookData } from "@/lib/bookData";
import { describe, type Piece } from "@/lib/layouts";
import { SITE_URL } from "@/lib/site";

/* The page around the book: the plain backdrop, the reader, and the same content as real HTML.
   The pages are drawn on a canvas that search engines can't read, so the text is also here,
   hidden from view (screen readers and crawlers get it). */
export function Magazine({ data, pieces, current }: { data: BookData; pieces: Piece[]; current?: Piece }) {
  const plain = (t: string) => t.replace(/\n/g, " ");
  const jsonLd = current
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: plain(current.title),
        description: describe(current, data.title),
        author: { "@type": "Person", name: current.credit || data.author },
        articleSection: current.label || current.layout,
        isPartOf: { "@type": "PublicationIssue", issueNumber: data.issue, name: data.title },
        url: `${SITE_URL}/${current.slug}`,
      }
    : {
        "@context": "https://schema.org",
        "@type": "PublicationIssue",
        name: data.title,
        issueNumber: data.issue,
        datePublished: data.year,
        url: SITE_URL,
        hasPart: pieces.map((p) => ({
          "@type": "Article",
          headline: plain(p.title),
          author: { "@type": "Person", name: p.credit || data.author },
          url: `${SITE_URL}/${p.slug}`,
        })),
      };

  return (
    <>
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, background: data.backdropColor, zIndex: -1 }} />
      <main className="stage">
        <Book pieces={pieces} data={data} startSlug={current?.slug} />
      </main>

      <div className="sr-only">
        {current ? (
          <article>
            <p>{data.title} · Magazine {data.issue}</p>
            <h1>{plain(current.title)}</h1>
            <p>{current.label || current.layout} — {current.credit || data.author}{current.location ? `, ${current.location}` : ""}</p>
            {current.body.split(/\n\s*\n/).filter(Boolean).map((para, i) =>
              para.startsWith("## ") ? <h2 key={i}>{para.slice(3)}</h2> : <p key={i}>{para.replace(/^[QA]:\s*/, "")}</p>)}
          </article>
        ) : (
          <header>
            <h1>{data.title}</h1>
            <p>Magazine {data.issue} — {data.year}. {data.tagline} {data.headline}.</p>
          </header>
        )}
        <nav aria-label="Contents">
          <h2>Contents</h2>
          <ul>
            {pieces.map((p) => (
              <li key={p.slug}><a href={`/${p.slug}`}>{plain(p.title)}</a> — {p.credit || data.author}</li>
            ))}
          </ul>
        </nav>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
