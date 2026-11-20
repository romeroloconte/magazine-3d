"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { deletePiece, duplicatePiece, savePalette, savePiece } from "./actions";
import { IMAGES_PER_LAYOUT, LAYOUTS, SHOWS_TEXT, SPREADS, contrast, sidesOf, type Layout, type Piece, type Side } from "@/lib/layouts";
import type { Fit } from "@/components/Book";
import type { PieceRow } from "@/lib/pieces";
import type { BookData } from "@/lib/bookData";
import { UploadIllustration } from "./UploadIllustration";
import { ColorField } from "./ColorField";
import { Icon } from "./Icon";
import { Preview } from "./Preview";

/* What the body field means for each layout */
const BODY_HINT: Record<Layout, string> = {
  essay: "Paragraphs separated by a blank line. Start a line with \"## \" for a subhead.",
  interview: "Paragraphs separated by a blank line. Start questions with \"Q: \" and answers with \"A: \".",
  opener: "Not shown on this layout (the title, credit and location are).",
  photo: "Not shown on this layout. The title and location become the caption.",
  "text-photo": "Paragraphs separated by a blank line; \"## \" for a subhead. The location becomes the photo caption.",
  "photo-text": "Paragraphs separated by a blank line; \"## \" for a subhead. The location becomes the photo caption.",
  poem: "One line per verse. Leave a blank line between stanzas.",
  spread: "Not shown on this layout. The title and location become the caption across the spread.",
  quote: "The quote itself, set large on the right page. The credit is shown under it.",
  gallery: "Not shown on this layout. The title and location become the caption.",
};

/* Layouts with their own design, offered next to the Left / Right choice */
const SPECIAL: Layout[] = ["spread", "gallery", "quote", "interview", "opener", "poem"];

export function PieceForm({ piece, book, index, nextPosition = 0 }: {
  piece?: PieceRow; book: BookData; index: number; nextPosition?: number;
}) {
  const id = piece?.id ?? null;
  const [state, action, pending] = useActionState(savePiece.bind(null, id), undefined);
  // everything the preview needs, kept in sync while typing
  const [draft, setDraft] = useState<Piece>({
    title: piece?.title ?? "", body: piece?.body ?? "", layout: piece?.layout ?? "text-photo",
    label: piece?.label ?? null, credit: piece?.credit ?? null, location: piece?.location ?? null,
    illustration: piece?.illustration ?? null, illustration2: piece?.illustration2 ?? null,
    illustration3: piece?.illustration3 ?? null, illustration4: piece?.illustration4 ?? null,
    background: piece?.background ?? null, ink: piece?.ink ?? null,
  });
  const [custom, setCustom] = useState(Boolean(piece?.background || piece?.ink));
  const [bg, setBg] = useState(piece?.background ?? book.pageColor);
  const [ink, setInk] = useState(piece?.ink ?? book.pageInk);
  const set = <K extends keyof Piece>(k: K) => (v: Piece[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const text = (k: "title" | "body" | "label" | "credit" | "location") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(k)((k === "title" || k === "body" ? e.target.value : e.target.value || null) as never);
  const preview: Piece = { ...draft, background: custom ? bg : null, ink: custom ? ink : null };
  const images = IMAGES_PER_LAYOUT[draft.layout];
  const [fit, setFit] = useState<Fit | null>(null);
  const ratio = contrast(custom ? bg : book.pageColor, custom ? ink : book.pageInk);
  const [paletteName, setPaletteName] = useState("");
  const [palettes, setPalettes] = useState(book.palettes);
  const applyPalette = (b: string, i: string) => { setCustom(true); setBg(b); setInk(i); setColorKey((k) => k + 1); };
  const [colorKey, setColorKey] = useState(0);
  // warn before leaving with unsaved changes
  const dirty = useRef(false);
  const saving = useRef(false);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current && !saving.current) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  // left/right choice: maps to one of the plain layouts; picking a side on a special layout starts from it
  const sides = sidesOf(draft.layout);
  const pickSide = (i: number, kind: Side) => {
    const [l, r] = sides ?? (["text", "photo"] as [Side, Side]);
    const next: [Side, Side] = i === 0 ? [kind, r] : [l, kind];
    set("layout")(SPREADS[`${next[0]}-${next[1]}`]);
  };
  const imageLabels: string[] =
    draft.layout === "photo" ? ["Left image", "Right image"]
      : draft.layout === "gallery" ? ["Left page, top", "Left page, bottom", "Right page, top", "Right page, bottom"]
        : draft.layout === "spread" ? ["Image across both pages"]
          : draft.layout === "photo-text" || draft.layout === "poem" ? ["Image (left page)"]
            : ["Image (right page)"];
  const keys = ["illustration", "illustration2", "illustration3", "illustration4"] as const;

  return (
    <div className="admin-box">
      <header className="admin-header">
        <h1>{piece ? "Edit piece" : "New piece"}</h1>
        <nav><Link href="/admin" className="admin-button"><Icon name="back" />Back</Link></nav>
      </header>
      <form action={action} className="form" onChange={() => { dirty.current = true; }} onSubmit={() => { saving.current = true; }}>
        <section className="preview-block">
          <h2><Icon name="eye" />Preview</h2>
          <p className="hint">This is how the spread looks in the magazine. It updates as you type; nothing is saved until you press Save.</p>
          <Preview piece={preview} book={book} index={index} onFit={setFit} />
        </section>
        <fieldset>
          <legend>Spread</legend>
          <input type="hidden" name="layout" value={draft.layout} />
          {/* the simple way: choose what goes on each page */}
          <div className="sides">
            {(["left", "right"] as const).map((side, i) => (
              <div key={side} className="side">
                <span>{side === "left" ? "Left page" : "Right page"}</span>
                <div className="segmented" role="radiogroup" aria-label={side === "left" ? "Left page" : "Right page"}>
                  {(["text", "photo"] as Side[]).map((kind) => {
                    const on = sides?.[i] === kind;
                    return (
                      <button key={kind} type="button" role="radio" aria-checked={on} className={on ? "on" : ""}
                        onClick={() => pickSide(i, kind)}>
                        <Icon name={kind === "text" ? "pencil" : "image"} />{kind === "text" ? "Text" : "Photo"}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* special layouts with their own design */}
          <span className="hint">Or use a special layout:</span>
          <div className="layouts">
            {SPECIAL.map((l) => (
              <label key={l} className={`layout-option${draft.layout === l ? " on" : ""}`}>
                <input type="radio" name="layout-special" checked={draft.layout === l} onChange={() => set("layout")(l)} />
                <b>{LAYOUTS[l].split(" — ")[0]}</b>
                <span>{LAYOUTS[l].split(" — ")[1]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="row">
          <label>
            Title
            <textarea name="title" rows={2} className="title-input" defaultValue={piece?.title} onChange={text("title")} required />
            <span className="hint">Use a line break to choose where the big title wraps.</span>
          </label>
          <label>
            Position
            <input type="number" name="position" defaultValue={piece?.position ?? nextPosition} />
          </label>
        </div>
        <div className="row-3">
          <label>Credit<input type="text" name="credit" defaultValue={piece?.credit ?? ""} onChange={text("credit")} placeholder={book.author} /></label>
          <label>Section label<input type="text" name="label" defaultValue={piece?.label ?? ""} onChange={text("label")} placeholder="from the layout" /></label>
          <label>Location<input type="text" name="location" defaultValue={piece?.location ?? ""} onChange={text("location")} placeholder="City, Country" /></label>
        </div>
        <label>
          Text
          <textarea name="body" defaultValue={piece?.body} onChange={text("body")} />
          <span className="hint">{BODY_HINT[draft.layout]}</span>
          {SHOWS_TEXT[draft.layout] && fit?.hasText && (
            <span className={`meter${fit.overflowWords > 0 ? " over" : ""}`}>
              <span className="meter-bar"><span style={{ width: `${Math.min(100, Math.round(fit.used * 100))}%` }} /></span>
              {fit.overflowWords > 0
                ? <><Icon name="warn" size={14} />{fit.overflowWords} word{fit.overflowWords === 1 ? "" : "s"} don&apos;t fit and will be cut. Shorten the text or split the piece in two.</>
                : <>{Math.round(fit.used * 100)}% of the space used</>}
            </span>
          )}
        </label>

        {images > 0 && (
          <div className="row-2">
            {keys.slice(0, images).map((k, i) => (
              <UploadIllustration key={k} name={k} label={imageLabels[i]} initial={piece?.[k] ?? null} onChange={set(k)} />
            ))}
          </div>
        )}
        {/* keep stored images when the layout doesn't show them */}
        {keys.slice(images).map((k) => <input key={k} type="hidden" name={k} value={draft[k] ?? ""} />)}

        <fieldset>
          <legend>Colors</legend>
          <label className="check">
            <input type="checkbox" name="customColors" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
            Custom colors for this spread (otherwise it uses the magazine&apos;s page colors)
          </label>
          {palettes.length > 0 && (
            <div className="palettes">
              <span className="hint">Saved palettes:</span>
              {palettes.map((pl) => (
                <button key={pl.name} type="button" className="palette-chip" style={{ background: pl.background, color: pl.ink }}
                  onClick={() => applyPalette(pl.background, pl.ink)} title={`${pl.background} / ${pl.ink}`}>{pl.name}</button>
              ))}
            </div>
          )}
          {custom && (
            <div key={colorKey}>
              <ColorField name="background" label="Page" value={bg} onChange={setBg} />
              <ColorField name="ink" label="Text" value={ink} onChange={setInk} />
              <div className="palette-save">
                <input type="text" value={paletteName} onChange={(e) => setPaletteName(e.target.value)} placeholder="Palette name" aria-label="Palette name" />
                <button type="button" onClick={async () => {
                  const name = paletteName.trim() || `${bg} / ${ink}`;
                  await savePalette({ name, background: bg, ink });
                  setPalettes((ps) => [...ps.filter((x) => x.name !== name), { name, background: bg, ink }]);
                  setPaletteName("");
                }}><Icon name="palette" />Save as palette</button>
              </div>
            </div>
          )}
          {ratio < 4.5 && (
            <p className="warning"><Icon name="warn" size={14} />Low contrast ({ratio.toFixed(1)}:1): the text may be hard to read. Aim for 4.5:1 or more.</p>
          )}
        </fieldset>

        <label>
          Link
          <input type="text" name="slug" defaultValue={piece?.slug} placeholder="generated from the title" />
        </label>
        <label className="check">
          <input type="checkbox" name="published" defaultChecked={piece?.published ?? true} />
          Published (otherwise it stays as a draft and isn&apos;t shown in the magazine)
        </label>
        {state?.error && <p className="error">{state.error}</p>}
        {/* Delete on the left, Save on the right. Delete submits its own form (form="delete-form") */}
        <div className="actions footer">
          {piece && <button type="submit" form="delete-form" className="danger"><Icon name="trash" />Delete</button>}
          {piece && <button type="submit" form="duplicate-form"><Icon name="copy" />Duplicate</button>}
          <button className="primary" disabled={pending}><Icon name="check" />{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
      {piece && (
        <form
          id="delete-form"
          action={deletePiece.bind(null, piece.id)}
          onSubmit={(e) => { if (!confirm(`Delete "${piece.title}"? This can't be undone.`)) e.preventDefault(); }}
          hidden
        />
      )}
      {piece && <form id="duplicate-form" action={duplicatePiece.bind(null, piece.id)} hidden />}
    </div>
  );
}
