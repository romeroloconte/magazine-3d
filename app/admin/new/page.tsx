import { listRows } from "@/lib/pieces";
import { getBookData } from "@/lib/bookData";
import { PieceForm } from "../PieceForm";

export default async function NewPiece() {
  const [rows, book] = await Promise.all([listRows(), getBookData()]);
  const next = Math.max(0, ...rows.map((r) => r.position)) + 1;
  return <PieceForm nextPosition={next} book={book} index={rows.length} />;
}
