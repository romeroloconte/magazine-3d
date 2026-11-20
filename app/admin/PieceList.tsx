"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { PieceRow } from "@/lib/pieces";
import { LAYOUTS } from "@/lib/layouts";
import { reorderPieces } from "./actions";
import { Icon } from "./Icon";

/* The pieces in magazine order. Drag a row by its handle (or use the arrow keys on it) to reorder. */
export function PieceList({ pieces }: { pieces: PieceRow[] }) {
  const [rows, setRows] = useState(pieces);
  const [drag, setDrag] = useState<number | null>(null);
  const [saving, start] = useTransition();
  const commit = (next: PieceRow[]) => {
    setRows(next);
    start(() => reorderPieces(next.map((r) => r.id)));
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return rows;
    const next = [...rows];
    const [r] = next.splice(from, 1);
    next.splice(to, 0, r);
    return next;
  };
  return (
    <>
      <p className="hint">Drag the handle to change the order of the magazine{saving ? " — saving…" : "."}</p>
      <ul className="admin-list">
        {rows.map((p, i) => (
          <li key={p.id} draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)}
            onDragOver={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { setRows(move(drag, i)); setDrag(i); } }}
            onDrop={(e) => { e.preventDefault(); commit(rows); }}
            className={drag === i ? "dragging" : ""}>
            <button type="button" className="grip" aria-label={`Move "${p.title}" (arrow keys)`}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); commit(move(i, i + (e.key === "ArrowUp" ? -1 : 1))); }
              }}><Icon name="grip" /></button>
            <span className="admin-number">{i + 1}</span>
            <span className="admin-swatch" style={{ background: p.background ?? undefined, color: p.ink ?? undefined }}>Aa</span>
            <div className="title">
              {p.title}
              <small>{LAYOUTS[p.layout]?.split(" —")[0] ?? p.layout} · /{p.slug}</small>
            </div>
            {!p.published && <span className="admin-tag"><Icon name="draft" size={13} />draft</span>}
            <Link href={`/admin/${p.id}/preview`} className="admin-button"><Icon name="eye" />View</Link>
            <Link href={`/admin/${p.id}`} className="admin-button"><Icon name="pencil" />Edit</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
