"use client";

import { useState } from "react";

/* Quick picks inspired by printed magazines; any color can be chosen with the picker */
export const SWATCHES = [
  "#f5f4f2", "#ffffff", "#e6e5e3", "#1c1b1a",
  "#ffe600", "#6e3fc7", "#e30613", "#1f4fd1", "#f2a7c3", "#2f6b4f",
];

/* A color input with swatches. Calls onChange so the live preview can follow. */
export function ColorField({ name, label, value, onChange }: {
  name: string; label: string; value: string; onChange?: (v: string) => void;
}) {
  const [color, setColor] = useState(value);
  const set = (v: string) => { setColor(v); onChange?.(v); };
  return (
    <div className="color-field">
      <span>{label}</span>
      <div className="color-row">
        <input type="color" name={name} value={color} onChange={(e) => set(e.target.value)} aria-label={label} />
        <code>{color}</code>
        <div className="swatches">
          {SWATCHES.map((s) => (
            <button key={s} type="button" className={s === color ? "on" : ""} style={{ background: s }}
              onClick={() => set(s)} aria-label={`Use ${s}`} title={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
