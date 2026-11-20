import Link from "next/link";
import Book from "@/components/Book";
import { hasDatabase, listRows } from "@/lib/pieces";
import { getBookData } from "@/lib/bookData";
import { Icon } from "../Icon";

/* The whole magazine as it would look with every draft published */
export default async function PreviewAll() {
  const [rows, book] = await Promise.all([hasDatabase() ? listRows() : Promise.resolve([]), getBookData()]);
  const pieces = rows.map(({ id: _, position: __, published: ___, ...p }) => p);
  return (
    <div className="admin-preview-all" style={{ background: book.backdropColor }}>
      <header className="admin-header">
        <h1>Preview with drafts</h1>
        <nav><Link href="/admin" className="admin-button"><Icon name="back" />Back</Link></nav>
      </header>
      <p className="notice"><Icon name="draft" />Drafts are included here; visitors only see published pieces.</p>
      <Book pieces={pieces} data={book} preview />
    </div>
  );
}
