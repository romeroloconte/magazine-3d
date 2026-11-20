import { hasDatabase } from "@/lib/pieces";
import { getBookData } from "@/lib/bookData";
import { BookForm } from "./BookForm";

export default async function BookPages() {
  if (!hasDatabase()) {
    return (
      <div className="admin-box">
        <h1>Database missing</h1>
        <p>Set the <code>DATABASE_URL</code> variable (Neon) to be able to edit the magazine.</p>
      </div>
    );
  }
  return <BookForm data={await getBookData()} />;
}
