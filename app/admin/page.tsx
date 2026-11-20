import Link from "next/link";
import { hasDatabase, listRows } from "@/lib/pieces";
import { logout } from "./actions";
import { Icon } from "./Icon";
import { PieceList } from "./PieceList";
import { Toast } from "./Toast";

export default async function Admin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  if (!hasDatabase()) {
    return (
      <div className="admin-box">
        <h1>Database missing</h1>
        <p>Set the <code>DATABASE_URL</code> variable (Neon) to be able to edit the magazine.</p>
      </div>
    );
  }
  const pieces = await listRows();
  return (
    <div className="admin-box">
      <header className="admin-header">
        <h1>Pieces</h1>
        <nav>
          <Link href="/admin/new" className="admin-button primary"><Icon name="plus" />New piece</Link>
          <Link href="/admin/book" className="admin-button"><Icon name="book" />Magazine &amp; design</Link>
          <Link href="/admin/preview-all" className="admin-button"><Icon name="eye" />Preview with drafts</Link>
          <Link href="/" className="admin-button" target="_blank"><Icon name="open" />View the magazine</Link>
          <form action={logout}><button><Icon name="logout" />Log out</button></form>
        </nav>
      </header>
      {saved && <Toast message={saved === "copy" ? "Copy created as a draft." : "Saved. The magazine now shows the changes."} />}
      {pieces.length === 0 ? (
        <p className="admin-empty">No pieces yet.</p>
      ) : (
        <PieceList pieces={pieces} />
      )}
    </div>
  );
}
