import { notFound } from "next/navigation";
import { getRow, listRows } from "@/lib/pieces";
import { getBookData } from "@/lib/bookData";
import { PieceForm } from "../PieceForm";

export default async function EditPiece({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const piece = Number.isInteger(Number(id)) ? await getRow(Number(id)) : null;
  if (!piece) notFound();
  const [rows, book] = await Promise.all([listRows(), getBookData()]);
  const index = Math.max(0, rows.filter((r) => r.published || r.id === piece.id).findIndex((r) => r.id === piece.id));
  return <PieceForm piece={piece} book={book} index={index} />;
}
