"use client";

import { useState } from "react";
import type { Palette } from "@/lib/layouts";
import { Icon } from "../Icon";

/* Editable list of saved color pairs; sent with the form as repeated fields */
export function Palettes({ initial }: { initial: Palette[] }) {
  const [list, setList] = useState(initial);
  const edit = (i: number, k: keyof Palette, v: string) => setList((l) => l.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <div className="palette-list">
      {list.map((p, i) => (
        <div key={i} className="palette-row">
          <span className="palette-chip" style={{ background: p.background, color: p.ink }}>Aa</span>
          <input type="text" name="paletteName" value={p.name} onChange={(e) => edit(i, "name", e.target.value)} aria-label="Palette name" />
          <input type="color" name="paletteBackground" value={p.background} onChange={(e) => edit(i, "background", e.target.value)} aria-label="Page color" />
          <input type="color" name="paletteInk" value={p.ink} onChange={(e) => edit(i, "ink", e.target.value)} aria-label="Text color" />
          <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== i))} aria-label={`Remove ${p.name}`}><Icon name="trash" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setList((l) => [...l, { name: `Palette ${l.length + 1}`, background: "#ffffff", ink: "#1c1b1a" }])}>
        <Icon name="plus" />Add palette
      </button>
    </div>
  );
}
