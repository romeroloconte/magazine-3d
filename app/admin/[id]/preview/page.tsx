import Link from "next/link";
import { notFound } from "next/navigation";
import { getRow, listRows } from "@/lib/pieces";
import { getBookData } from "@/lib/bookData";
import { Preview } from "../../Preview";
import { Icon } from "../../Icon";

export default async function PiecePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const piece = Number.isInteger(Number(id)) ? await getRow(Number(id)) : null;
  if (!piece) notFound();
  // its place in the magazine (drafts are treated as if published now)
  const [rows, book] = await Promise.all([listRows(), getBookData()]);
  const index = Math.max(0, rows.filter((r) => r.published || r.id === piece.id).findIndex((r) => r.id === piece.id));
  return (
    <div className="admin-box wide">
      <header className="admin-header">
        <h1>{piece.title}</h1>
        <nav>
          <Link href={`/admin/${piece.id}`} className="admin-button primary"><Icon name="pencil" />Edit</Link>
          <Link href="/admin" className="admin-button"><Icon name="back" />Back</Link>
        </nav>
      </header>
      {!piece.published && <p className="notice"><Icon name="draft" />This is a draft: this is how it will look once published.</p>}
      <Preview piece={piece} book={book} index={index} />
    </div>
  );
}
