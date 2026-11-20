"use client";

import { useEffect, useRef, useState } from "react";
import { lastFit, loadFonts, loadOptional, piecePages, type Fit, type PieceArt } from "@/components/Book";
import type { Piece } from "@/lib/layouts";
import type { BookData } from "@/lib/bookData";
import { Icon } from "./Icon";

/* The piece's spread exactly as it appears in the magazine, drawn the same way.
   Also reports how much of the text fits (onFit), so the form can warn before text gets cut. */
export function Preview({ piece, book, index, onFit }: {
  piece: Piece; book: BookData; index: number; onFit?: (f: Fit) => void;
}) {
  const [art, setArt] = useState<PieceArt>({ a: null, b: null });
  const [fontsReady, setFontsReady] = useState(false);
  const [images, setImages] = useState<[string, string] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const fit = useRef(onFit);
  fit.current = onFit;

  useEffect(() => { loadFonts().then(() => setFontsReady(true)); }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([piece.illustration, piece.illustration2, piece.illustration3, piece.illustration4].map(loadOptional))
      .then(([a, b, c, d]) => alive && setArt({ a, b, c, d }));
    return () => { alive = false; };
  }, [piece.illustration, piece.illustration2, piece.illustration3, piece.illustration4]);

  // redraw shortly after typing stops, not on every keystroke
  useEffect(() => {
    if (!fontsReady) return;
    const t = setTimeout(() => {
      const [left, right] = piecePages({ ...piece, title: piece.title || "Untitled" }, art, 2 * index + 1, index, book);
      fit.current?.(lastFit());
      setImages([left.src.toDataURL("image/jpeg", 0.85), right.src.toDataURL("image/jpeg", 0.85)]);
    }, 250);
    return () => clearTimeout(t);
  }, [piece, art, index, book, fontsReady]);

  const fullscreen = () => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div className="preview" ref={box} aria-label="Spread preview">
      {images ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="Left page" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[1]} alt="Right page" />
          <button type="button" className="preview-full" onClick={fullscreen} aria-label="Full screen" title="Full screen">
            <Icon name="expand" />
          </button>
        </>
      ) : (
        <p className="hint">Preparing preview…</p>
      )}
    </div>
  );
}
