"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlignLeft, ChevronLeft, ChevronRight, LayoutGrid, X, ZoomIn } from "lucide-react";
import { LeafThrough, type LeafThroughHandle } from "leafthrough/react";
import type { BookData } from "@/lib/bookData";
import type { Piece } from "@/lib/layouts";
import { illustrationSrc } from "@/lib/illustration";

/* piece: index of the piece the page belongs to (used to sync the URL and the top bar) */
type Page = { src: HTMLCanvasElement; alt: string; text?: string; piece?: number };

/* Size of each page in pixels, and the page margin */
const W = 1000, H = 1320, M = 96;

/* Labels used for filler pages (they are hidden on mobile) */
const BLANK = "Blank page";
const INSIDE_FRONT = "Inside front cover";
const INSIDE_BACK = "Inside back cover";

const LABELS: Record<Piece["layout"], string> = {
  essay: "Essay", interview: "Interview", opener: "Portfolio", photo: "Portfolio", poem: "Poem",
  "text-photo": "Feature", "photo-text": "Feature", spread: "Portfolio", quote: "Quote", gallery: "Portfolio",
};

/* ---------- drawing helpers ---------- */

function font(variable: string, fallback: string) {
  const v = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}
const fonts = () => ({
  serif: font("--serif", "Georgia, serif"),
  display: font("--display", "Georgia, serif"),
  sans: font("--sans", "'Helvetica Neue', Arial, sans-serif"),
});

function canvas(background: string) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = background;
  g.fillRect(0, 0, W, H);
  return { c, g };
}

/* Same color at lower opacity, for secondary text */
function soft(hex: string, alpha = 0.6) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/* Paints a CSS linear-gradient (angle in degrees, stops in 0–1) over the whole canvas */
function cssGradient(g: CanvasRenderingContext2D, degrees: number, stops: [number, string][]) {
  const a = (degrees * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
  const length = Math.abs(W * dx) + Math.abs(H * dy);
  const x0 = W / 2 - (dx * length) / 2, y0 = H / 2 - (dy * length) / 2;
  const d = g.createLinearGradient(x0, y0, x0 + dx * length, y0 + dy * length);
  for (const [t, color] of stops) d.addColorStop(Math.min(1, Math.max(0, t)), color);
  g.fillStyle = d;
  g.fillRect(0, 0, W, H);
}

/* Wraps a line into several that fit the width */
function wrap(g: CanvasRenderingContext2D, line: string, width: number, indent = "") {
  const words = line.split(" ");
  const out: string[] = [];
  let current = "";
  for (const w of words) {
    const attempt = current ? `${current} ${w}` : w;
    if (g.measureText(attempt).width > width && current) {
      out.push(current);
      current = indent + w;
    } else current = attempt;
  }
  out.push(current);
  return out;
}

/* Largest font size (between min and max) at which the text fits in the width */
function fitSize(g: CanvasRenderingContext2D, text: string, family: string, width: number, max: number, min = 20, weight = "") {
  for (let s = max; s > min; s -= 2) {
    g.font = `${weight} ${s}px ${family}`;
    if (g.measureText(text).width <= width) return s;
  }
  return min;
}

/* Letter-spaced text (canvas letterSpacing isn't supported everywhere) */
function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: "left" | "center" | "right" = "left") {
  const chars = [...text];
  const width = chars.reduce((w, ch) => w + g.measureText(ch).width, 0) + spacing * (chars.length - 1);
  let cx = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  const prev = g.textAlign;
  g.textAlign = "left";
  for (const ch of chars) {
    g.fillText(ch, cx, y);
    cx += g.measureText(ch).width + spacing;
  }
  g.textAlign = prev;
}

/* Section label at the top of the page, like "ESSAY" in a magazine */
function sectionLabel(g: CanvasRenderingContext2D, text: string, ink: string) {
  g.fillStyle = ink;
  g.font = `700 22px ${fonts().sans}`;
  spaced(g, text.toUpperCase(), W / 2, 74, 2, "center");
}

/* Page number at the foot, "12." style: left pages on the left, right pages on the right */
function pageNumber(g: CanvasRenderingContext2D, n: number, ink: string) {
  g.save();
  g.fillStyle = ink;
  g.font = `28px ${fonts().display}`;
  const left = n % 2 === 1;
  g.textAlign = left ? "left" : "right";
  g.fillText(`${n}.`, left ? M - 30 : W - M + 30, H - 62);
  g.restore();
}

/* Vertical credit along the outer edge of a left page: "Text by ........ Name" */
function verticalCredit(g: CanvasRenderingContext2D, lead: string, name: string, ink: string) {
  g.save();
  g.fillStyle = ink;
  g.font = `34px ${fonts().display}`;
  g.translate(70, 150);
  g.rotate(Math.PI / 2);
  g.textAlign = "left";
  g.fillText(lead, 0, 0);
  g.textAlign = "right";
  g.fillText(name, H - 520, 0);
  g.restore();
}

/* Draws an image inside a frame. cover = fill and crop (photos); otherwise the whole image fits */
function drawImage(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, cover = true) {
  const e = cover ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
  const iw = img.width * e, ih = img.height * e;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  g.restore();
}

/* Empty image frame with an image icon, so a missing image still reads as a layout */
function placeholder(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ink: string) {
  g.fillStyle = soft(ink, 0.07);
  g.fillRect(x, y, w, h);
  // image icon: a framed picture with a sun and a mountain, centered
  const s = Math.min(w, h) * 0.16, cx = x + w / 2, cy = y + h / 2;
  g.save();
  g.strokeStyle = soft(ink, 0.35);
  g.lineWidth = Math.max(3, s * 0.06);
  g.lineJoin = "round";
  g.lineCap = "round";
  g.beginPath();
  g.roundRect(cx - s, cy - s * 0.8, s * 2, s * 1.6, s * 0.15);
  g.stroke();
  g.beginPath();
  g.arc(cx - s * 0.4, cy - s * 0.3, s * 0.18, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(cx - s, cy + s * 0.55);
  g.lineTo(cx - s * 0.2, cy - s * 0.1);
  g.lineTo(cx + s * 0.3, cy + s * 0.35);
  g.lineTo(cx + s * 0.55, cy + s * 0.15);
  g.lineTo(cx + s, cy + s * 0.55);
  g.stroke();
  g.restore();
}

/* Image frame: same margin on every side, so images and placeholders sit centered on the page */
const FRAME_RIGHT = { x: 70, y: 70, w: W - 140, h: H - 140 };
const FRAME_LEFT = FRAME_RIGHT;

/* How well the last piece's text fit its page(s): share of the space used, and words that didn't fit.
   The admin reads it (lastFit) to show a space meter while typing. */
export type Fit = { used: number; overflowWords: number; hasText: boolean };
let FIT: Fit = { used: 0, overflowWords: 0, hasText: false };
export const lastFit = () => FIT;
const countWords = (t: string) => (t.match(/\S+/g) ?? []).length;

/* Flows text blocks through one or more columns.
   Blocks: plain paragraphs, "## " subheads, "Q:" questions and answers (prefixed with initials). */
type Column = { x: number; y: number; bottom: number; width: number };
function flow(g: CanvasRenderingContext2D, body: string, columns: Column[], ink: string, size: number, initials = "") {
  const { serif, display, sans } = fonts();
  const blocks = body.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/).filter((b) => b.trim());
  const total = countWords(body);
  let drawnWords = 0;
  let ci = 0, y = columns[0].y;
  const lh = size * 1.45;
  const next = (need: number) => {
    if (y + need <= columns[ci].bottom) return true;
    if (ci + 1 >= columns.length) return false;
    ci++;
    y = columns[ci].y;
    return true;
  };
  const report = (complete: boolean) => {
    // space used: full columns before the current one, plus how far down the current one we got
    const c = columns[ci];
    const share = (ci + Math.min(1, (y - c.y) / Math.max(1, c.bottom - c.y))) / columns.length;
    FIT = { used: complete ? share : 1, overflowWords: complete ? 0 : Math.max(0, total - drawnWords), hasText: total > 0 };
  };
  g.textAlign = "left";
  for (const raw of blocks) {
    const block = raw.trim();
    const col = () => columns[ci];
    if (block.startsWith("## ")) {
      // subhead, like "I. Virtual Avenues"
      g.font = `${size * 2}px ${display}`;
      const lines = wrap(g, block.slice(3), col().width * 0.8);
      if (!next(lines.length * size * 2.1 + size)) return report(false);
      y += size * 0.6;
      for (const l of lines) { g.fillStyle = ink; g.fillText(l, col().x, y + size * 1.6); y += size * 2.1; }
      drawnWords += countWords(block.slice(3));
      y += size * 0.8;
      continue;
    }
    const isQ = /^Q:\s*/.test(block);
    const isA = !!initials && !isQ && /^A:\s*/.test(block);
    const text = block.replace(/^[QA]:\s*/, "");
    const indent = isA ? size * 1.2 : 0;
    if (isA) {
      if (!next(lh * 2)) return report(false);
      g.fillStyle = ink;
      g.font = `700 ${Math.round(size * 0.8)}px ${sans}`;
      g.fillText(initials, col().x, y + size);
      y += lh;
    }
    g.font = `${size}px ${serif}`;
    for (const para of text.split("\n")) {
      for (const l of wrap(g, para, col().width - indent)) {
        if (!next(lh)) return report(false);
        g.fillStyle = ink;
        g.fillText(l, col().x + indent, y + size);
        drawnWords += countWords(l);
        y += lh;
      }
    }
    y += size * 0.9;
  }
  report(true);
}

/* "Jane Doe" → "JD" */
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).join("").slice(0, 3);

/* Big title on a page, shrinking when it's long */
function bigTitle(g: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, ink: string, max = 120, lineGap = 1.05) {
  const { display } = fonts();
  let size = max, lines: string[] = [];
  for (; size >= 56; size -= 8) {
    g.font = `${size}px ${display}`;
    lines = text.split("\n").flatMap((l) => wrap(g, l, width));
    if (lines.length <= 7) break;
  }
  g.fillStyle = ink;
  g.textAlign = "left";
  lines.forEach((l, i) => g.fillText(l, x, y + i * size * lineGap));
  return y + (lines.length - 1) * size * lineGap;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    // Vercel Blob images come from another domain: without this the canvas gets "tainted" and can't be used
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

/* A text page: label, big title, credit, then the text in one column (with "## " subheads) */
function textPage(g: CanvasRenderingContext2D, p: Piece, label: string, credit: string, ink: string, n: number) {
  const { display } = fonts();
  sectionLabel(g, label, ink);
  const x = M - 20, width = W - 2 * M + 40;
  const y = bigTitle(g, p.title, x, 230, width, ink, 92);
  g.fillStyle = soft(ink, 0.75);
  g.font = `30px ${display}`;
  g.textAlign = "left";
  g.fillText(`By ${credit}`, x, y + 70);
  flow(g, p.body, [{ x, y: y + 120, bottom: H - 130, width: width * 0.86 }], ink, 23);
  pageNumber(g, n, ink);
}

/* An image page: the image fills the frame, or a placeholder; optional caption under it */
function imagePage(g: CanvasRenderingContext2D, img: HTMLImageElement | null, ink: string, caption?: string) {
  const f = { x: 70, y: 70, w: W - 140, h: H - 200 };
  if (img) drawImage(g, img, f.x, f.y, f.w, f.h); else placeholder(g, f.x, f.y, f.w, f.h, ink);
  if (caption) {
    g.fillStyle = soft(ink);
    g.font = `italic 22px ${fonts().serif}`;
    g.textAlign = "left";
    g.fillText(caption, f.x, H - 80);
  }
}

/* ---------- a piece's spread ---------- */

export type PieceArt = { a: HTMLImageElement | null; b: HTMLImageElement | null; c?: HTMLImageElement | null; d?: HTMLImageElement | null };

/* The piece's double-page spread, drawn with its layout. Used in the book and in the admin preview.
   n is the left page's number (always odd) and index the piece's position in the magazine. */
export function piecePages(p: Piece, art: PieceArt, n: number, index: number, d: BookData): [Page, Page] {
  const { serif, display } = fonts();
  const bg = p.background || d.pageColor;
  const ink = p.ink || d.pageInk;
  const label = p.label || LABELS[p.layout];
  const credit = p.credit || d.author;
  const left = canvas(bg), right = canvas(bg);
  const L = left.g, R = right.g;
  let leftAlt = p.title;
  const text = p.body;
  FIT = { used: 0, overflowWords: 0, hasText: false };

  switch (p.layout) {
    case "essay": {
      // left: label, vertical "Text by", the title huge; right: text in two columns
      sectionLabel(L, label, ink);
      verticalCredit(L, "Text by", credit, ink);
      bigTitle(L, p.title, 230, 300, W - 230 - M + 20, ink, 120, 1.08);
      pageNumber(L, n, ink);
      sectionLabel(R, label, ink);
      const top = 150, bottom = H - 130, gap = 40, cw = (W - 2 * M + 40 - gap) / 2;
      flow(R, text, [
        { x: M - 20, y: top, bottom, width: cw },
        { x: M - 20 + cw + gap, y: top, bottom, width: cw },
      ], ink, 22);
      pageNumber(R, n + 1, ink);
      break;
    }
    case "interview": {
      // left: label, vertical "with", Q&A in two columns; right: the image
      sectionLabel(L, label, ink);
      verticalCredit(L, "with", credit, ink);
      const top = 150, bottom = H - 130, gap = 34, x0 = 200, cw = (W - x0 - M + 40 - gap) / 2;
      flow(L, text, [
        { x: x0, y: top, bottom, width: cw },
        { x: x0 + cw + gap, y: top, bottom, width: cw },
      ], ink, 19, initialsOf(credit));
      pageNumber(L, n, ink);
      const f = FRAME_RIGHT;
      if (art.a) drawImage(R, art.a, f.x, f.y, f.w, f.h); else placeholder(R, f.x, f.y, f.w, f.h, ink);
      break;
    }
    case "opener": {
      // left: "88.", name, title, location; right: the image
      L.fillStyle = ink;
      L.textAlign = "left";
      L.font = `110px ${display}`;
      L.fillText(`${n}.`, M - 30, M + 90);
      const y = bigTitle(L, credit, M - 30, 520, W - 2 * M, ink, 96, 1.05);
      bigTitle(L, p.title, M - 30, y + 200, W - 2 * M, ink, 96, 1.05);
      if (p.location) {
        L.fillStyle = ink;
        L.font = `600 22px ${fonts().sans}`;
        L.fillText(p.location, M - 30, H - 62);
      }
      const f = FRAME_RIGHT;
      if (art.a) drawImage(R, art.a, f.x, f.y, f.w, f.h); else placeholder(R, f.x, f.y, f.w, f.h, ink);
      break;
    }
    case "text-photo": {
      textPage(L, p, label, credit, ink, n);
      imagePage(R, art.a, ink, p.location ?? undefined);
      break;
    }
    case "photo-text": {
      imagePage(L, art.a, ink, p.location ?? undefined);
      textPage(R, p, label, credit, ink, n + 1);
      leftAlt = `Photo: ${p.title}`;
      break;
    }
    case "spread": {
      // one image across both pages: drawn on a double-width canvas, then split at the spine
      const both = document.createElement("canvas");
      both.width = W * 2; both.height = H;
      const B = both.getContext("2d")!;
      B.fillStyle = bg;
      B.fillRect(0, 0, W * 2, H);
      if (art.a) drawImage(B, art.a, 0, 0, W * 2, H);
      else placeholder(B, 70, 70, W * 2 - 140, H - 140, ink);
      L.drawImage(both, 0, 0, W, H, 0, 0, W, H);
      R.drawImage(both, W, 0, W, H, 0, 0, W, H);
      if (p.title || p.location) {
        // caption on a small band so it reads over any photo
        const cap = [p.title.replace(/\n/g, " "), p.location].filter(Boolean).join(", ");
        L.font = `italic 22px ${serif}`;
        const w = L.measureText(cap).width + 36;
        L.fillStyle = soft(bg, 0.85);
        L.fillRect(52, H - 112, w, 46);
        L.fillStyle = ink;
        L.textAlign = "left";
        L.fillText(cap, 70, H - 81);
      }
      leftAlt = `Photo: ${p.title}`;
      break;
    }
    case "quote": {
      // left: a giant quotation mark; right: the quote set large, and who said it
      L.fillStyle = ink;
      L.font = `640px ${display}`;
      L.textAlign = "left";
      L.fillText("\u201C", M - 40, 720);
      sectionLabel(R, label, ink);
      const x = M - 20, width = W - 2 * M + 40;
      const quote = text.trim() || p.title;
      let size = 76, lines: string[] = [];
      for (; size >= 36; size -= 4) {
        R.font = `${size}px ${display}`;
        lines = quote.split("\n").flatMap((l) => wrap(R, l, width));
        if (lines.length * size * 1.15 <= H - 520) break;
      }
      const y0 = Math.max(260, (H - lines.length * size * 1.15) / 2);
      R.fillStyle = ink;
      R.textAlign = "left";
      lines.forEach((l, i) => R.fillText(l, x, y0 + i * size * 1.15));
      R.font = `32px ${display}`;
      R.fillText(`— ${credit}`, x, y0 + lines.length * size * 1.15 + 60);
      FIT = { used: Math.min(1, (lines.length * size * 1.15) / (H - 520)), overflowWords: 0, hasText: true };
      pageNumber(R, n + 1, ink);
      break;
    }
    case "gallery": {
      // four images, two stacked on each page, with a caption under the last one
      const gap = 30, fw = W - 140, fh = (H - 200 - gap) / 2;
      const imgs = [art.a, art.b, art.c ?? null, art.d ?? null];
      const cell = (G: CanvasRenderingContext2D, img: HTMLImageElement | null, row: number) => {
        const y = 70 + row * (fh + gap);
        if (img) drawImage(G, img, 70, y, fw, fh); else placeholder(G, 70, y, fw, fh, ink);
      };
      cell(L, imgs[0], 0); cell(L, imgs[1], 1); cell(R, imgs[2], 0); cell(R, imgs[3], 1);
      if (p.title || p.location) {
        R.fillStyle = soft(ink);
        R.font = `italic 22px ${serif}`;
        R.textAlign = "right";
        R.fillText([p.title.replace(/\n/g, " "), p.location].filter(Boolean).join(", "), W - 70, H - 80);
      }
      pageNumber(L, n, ink);
      leftAlt = `Gallery: ${p.title}`;
      break;
    }
    case "photo": {
      // two images facing each other, slightly different crops like a portfolio spread
      const fl = { x: 70, y: 70, w: W - 140, h: H - 200 };
      const fr = fl;
      if (art.a) drawImage(L, art.a, fl.x, fl.y, fl.w, fl.h); else placeholder(L, fl.x, fl.y, fl.w, fl.h, ink);
      const b = art.b ?? art.a;
      if (b) drawImage(R, b, fr.x, fr.y, fr.w, fr.h); else placeholder(R, fr.x, fr.y, fr.w, fr.h, ink);
      if (p.title || p.location) {
        L.fillStyle = soft(ink);
        L.font = `italic 22px ${serif}`;
        L.textAlign = "left";
        L.fillText([p.title, p.location].filter(Boolean).join(", "), fl.x, H - 80);
      }
      leftAlt = `Photo: ${p.title}`;
      break;
    }
    default: {
      // poem: the illustration (whole, not cropped) on the left, the poem on the right
      if (art.a) drawImage(L, art.a, FRAME_LEFT.x + 40, FRAME_LEFT.y + 60, FRAME_LEFT.w - 80, FRAME_LEFT.h - 120, false);
      else {
        L.fillStyle = ink;
        L.font = `110px ${display}`;
        L.textAlign = "left";
        L.fillText(`${n}.`, M - 30, M + 90);
      }
      if (art.a) pageNumber(L, n, ink);
      sectionLabel(R, label, ink);
      const x = M + 20, width = W - x - M + 20;
      let y = bigTitle(R, p.title, x, 240, width, ink, 88) + 110;
      const stanzas = text.trim().split(/\n\s*\n/).map((s) => s.split("\n"));
      const count = stanzas.reduce((c, s) => c + s.length + 1, 0);
      const fs = Math.max(22, Math.min(34, Math.floor((H - y - 130) / (count * 1.5))));
      const need = count * fs * 1.5, room = H - y - 130;
      FIT = { used: Math.min(1, need / room), overflowWords: need > room ? Math.ceil(((need - room) / (fs * 1.5)) * 5) : 0, hasText: count > 0 };
      R.font = `${fs}px ${serif}`;
      R.fillStyle = ink;
      for (const s of stanzas) {
        for (const l of s) for (const t of wrap(R, l, width, "  ")) { R.fillText(t, x, y); y += fs * 1.5; }
        y += fs * 0.8;
      }
      R.font = `30px ${display}`;
      R.fillText(`— ${credit}`, x, Math.min(y + 40, H - 140));
      pageNumber(R, n + 1, ink);
    }
  }
  return [
    { src: left.c, alt: leftAlt },
    { src: right.c, alt: p.title, text: p.body },
  ];
}

/* ---------- covers ---------- */

/* Typographic front cover: masthead, tagline, big headline, "Feat." with the contributors, "MAGAZINE 01" */
function frontCover(pieces: Piece[], d: BookData) {
  const { display, sans } = fonts();
  const { c, g } = canvas(d.coverColor);
  g.fillStyle = d.coverInk;
  g.textAlign = "center";
  // masthead and headline: heavy uppercase, as wide as the page allows
  const top = d.title.toUpperCase();
  const ts = fitSize(g, top, sans, W - 2 * M - 40, 150, 48, "800");
  g.font = `800 ${ts}px ${sans}`;
  g.fillText(top, W / 2, M + ts * 0.75);
  const mid = d.headline.toUpperCase();
  const hs = fitSize(g, mid, sans, W - 2 * M - 40, 150, 48, "800");
  g.font = `800 ${hs}px ${sans}`;
  g.fillText(mid, W / 2, 640);
  // tagline and "Feat." in the flared serif
  g.textAlign = "left";
  g.font = `64px ${display}`;
  g.fillText(d.tagline, M + 120, 380);
  g.fillText("Feat.", M + 120, 790);
  // contributors, right-aligned
  const names = [...new Set(pieces.map((p) => p.credit || d.author))].slice(0, 12);
  g.textAlign = "right";
  g.font = `30px ${display}`;
  names.forEach((name, i) => g.fillText(name, W - M - 10, 730 + i * 38));
  // foot: MAGAZINE + issue number
  g.textAlign = "left";
  g.font = `800 92px ${sans}`;
  const word = "MAGAZINE";
  const ww = g.measureText(word).width;
  const fx = (W - ww) / 2 - 24;
  g.fillText(word, fx, H - M + 10);
  g.font = `700 38px ${sans}`;
  g.fillText(d.issue, fx + ww + 12, H - M - 40);
  // a touch of light, like a printed cover
  cssGradient(g, 139.24, [[0.0108, "rgba(19,19,19,0)"], [1, "rgba(0,0,0,0.18)"]]);
  cssGradient(g, 90, [[0, "rgba(0,0,0,0.12)"], [0.0533, "rgba(0,0,0,0.12)"], [0.0533, "rgba(191,191,191,0.25)"], [0.0616, "rgba(112,112,112,0)"]]);
  cssGradient(g, -37.72, [[0, "rgba(0,0,0,0.08)"], [0.336, "rgba(0,0,0,0)"], [0.6255, "rgba(255,255,255,0)"], [0.9925, "rgba(255,255,255,0.12)"]]);
  return c;
}

/* Back cover: its own colors, a short text, and the masthead at the foot */
function backCover(d: BookData) {
  const { display, sans } = fonts();
  const { c, g } = canvas(d.backColor);
  g.fillStyle = d.backInk;
  g.textAlign = "left";
  if (d.backText) {
    g.font = `56px ${display}`;
    d.backText.split("\n").flatMap((l) => wrap(g, l, W - 2 * M)).forEach((l, i) => g.fillText(l, M, 300 + i * 70));
  }
  g.textAlign = "center";
  g.font = `800 64px ${sans}`;
  g.fillText(d.title.toUpperCase(), W / 2, H - M - 40);
  g.font = `30px ${display}`;
  g.fillText(`Magazine ${d.issue} — ${d.year}`, W / 2, H - M + 10);
  return c;
}

/* ---------- the whole magazine ---------- */

function buildPages(pieces: Piece[], art: PieceArt[], d: BookData): Page[] {
  const { serif, display, sans } = fonts();
  const bg = d.pageColor, ink = d.pageInk;
  const pages: Page[] = [];

  pages.push({ src: frontCover(pieces, d), alt: `Cover: ${d.title}` });
  pages.push({ src: canvas(d.coverColor).c, alt: INSIDE_FRONT });

  // Front matter. Right-hand pages sit at even positions (2, 4, 6, 8) and the last one leaves the
  // next page odd, so every spread still starts on a left page
  const blank = () => ({ src: canvas(bg).c, alt: BLANK });
  const paragraph = (g: CanvasRenderingContext2D, t: string, width: number) =>
    t.split("\n").flatMap((l) => (l.trim() ? wrap(g, l.trim(), width) : [""]));

  // Title page
  {
    const { c, g } = canvas(bg);
    const y = bigTitle(g, d.title, M - 30, 380, W - 2 * M, ink, 120);
    g.font = `48px ${display}`;
    g.fillText(d.author, M - 30, y + 110);
    g.font = `700 22px ${sans}`;
    spaced(g, `MAGAZINE ${d.issue} — ${d.year}`, M - 30, H - 62, 2);
    pages.push({ src: c, alt: `Title page: ${d.title}` });
  }
  // Copyright page, on the back of the title page
  {
    const { c, g } = canvas(bg);
    g.fillStyle = ink;
    g.textAlign = "left";
    g.font = `24px ${serif}`;
    [d.title, `© ${d.year} ${d.author}`, `Images: ${d.illustrator || "[name]"}`, d.rights]
      .forEach((t, i) => g.fillText(t, M - 30, H - 250 + i * 40));
    pages.push({ src: c, alt: "Copyright" });
  }
  // Dedication and epigraph each come with a blank page: hiding one removes both
  if (d.showDedication) {
    const { c, g } = canvas(bg);
    sectionLabel(g, "Dedication", ink);
    g.fillStyle = ink;
    g.textAlign = "left";
    g.font = `56px ${display}`;
    paragraph(g, d.dedication || "For [dedication]", W - 2 * M).forEach((l, k) => g.fillText(l, M - 30, 480 + k * 70));
    pages.push({ src: c, alt: "Dedication", text: d.dedication }, blank());
  }
  if (d.showEpigraph) {
    const { c, g } = canvas(bg);
    sectionLabel(g, "Epigraph", ink);
    g.fillStyle = ink;
    g.textAlign = "right";
    g.font = `italic 36px ${serif}`;
    const lines = paragraph(g, d.epigraph || "[Epigraph quote]", W - 2 * M - 120);
    lines.forEach((l, k) => g.fillText(l, W - M, 480 + k * 54));
    g.fillStyle = soft(ink);
    g.font = `30px ${display}`;
    g.fillText(`— ${d.epigraphAuthor || "[Author]"}`, W - M, 480 + lines.length * 54 + 30);
    pages.push({ src: c, alt: "Epigraph", text: [d.epigraph, d.epigraphAuthor].filter(Boolean).join("\n— ") }, blank());
  }
  // Contents: page number, title and contributor, with the section on the right
  {
    const { c, g } = canvas(bg);
    sectionLabel(g, "Contents", ink);
    const step = Math.min(110, Math.floor((H - 380) / Math.max(1, pieces.length)));
    // with many pieces the rows get closer, so everything shrinks with them
    const k = step / 110;
    const px = (n: number) => Math.round(n * Math.max(k, 0.5));
    pieces.forEach((p, i) => {
      const y = 280 + i * step;
      g.fillStyle = ink;
      g.textAlign = "left";
      g.font = `${px(52)}px ${display}`;
      g.fillText(`${2 * i + 1}.`, M - 30, y);
      g.font = `${Math.round(40 * k)}px ${display}`;
      const title = p.title.replace(/\n/g, " ");
      const labelRoom = 200;
      g.fillText(title, M + px(120), y, W - M - labelRoom - (M + px(120)));
      g.fillStyle = soft(ink);
      g.font = `${Math.round(24 * k)}px ${serif}`;
      g.fillText(p.credit || d.author, M + px(120), y + Math.round(36 * k));
      g.textAlign = "right";
      g.font = `700 ${Math.max(12, Math.round(18 * k))}px ${sans}`;
      spaced(g, (p.label || LABELS[p.layout]).toUpperCase(), W - M + 20, y, 2, "right");
    });
    pages.push({ src: c, alt: "Contents", text: pieces.map((p, i) => `${2 * i + 1}. ${p.title}`).join("\n") });
  }

  // Each piece takes a spread starting on a left page (page 2i+1)
  pieces.forEach((p, i) => pages.push(...piecePages(p, art[i], 2 * i + 1, i, d).map((pg) => ({ ...pg, piece: i }))));

  // Back cover. leafthrough pairs pages two by two (front and back of each sheet): the total must be
  // even so the back cover is the reverse of the last sheet and no blank face is left over
  pages.push({ src: canvas(bg).c, alt: BLANK });
  pages.push({ src: canvas(d.backColor).c, alt: INSIDE_BACK });
  pages.push({ src: backCover(d), alt: "Back cover" });
  return pages;
}

/* Loads every font the canvas uses (they only download when something asks for them) */
export function loadFonts() {
  const f = fonts();
  return Promise.all(
    [`100px ${f.display}`, `100px ${f.serif}`, `italic 100px ${f.serif}`, `800 100px ${f.sans}`, `700 100px ${f.sans}`]
      .map((spec) => document.fonts.load(spec)),
  ).catch(() => {});
}

/* An image that fails to load must not stop the magazine from showing */
export const loadOptional = (v: string | null) => (v ? loadImage(illustrationSrc(v)).catch(() => null) : Promise.resolve(null));

/* Small picture of a spread (or a single page), for the contents panel */
function thumbnail(left: HTMLCanvasElement, right?: HTMLCanvasElement) {
  const h = 200, w = Math.round((W / H) * h);
  const c = document.createElement("canvas");
  c.width = right ? w * 2 : w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.drawImage(left, 0, 0, w, h);
  if (right) g.drawImage(right, w, 0, w, h);
  return c.toDataURL("image/jpeg", 0.8);
}

/* A piece as readable text (the "Read as text" view) */
function PieceText({ piece, data }: { piece: Piece; data: BookData }) {
  const blocks = piece.body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <article className="text-view-article">
      <p className="text-view-label">{piece.label || LABELS[piece.layout]}</p>
      <h2>{piece.title.replace(/\n/g, " ")}</h2>
      <p className="text-view-credit">{piece.credit || data.author}{piece.location ? ` · ${piece.location}` : ""}</p>
      {blocks.length === 0 && <p className="text-view-empty">This piece is visual: no text to show.</p>}
      {blocks.map((b, i) =>
        b.startsWith("## ") ? <h3 key={i}>{b.slice(3)}</h3>
          : /^Q:\s*/.test(b) ? <p key={i} className="q">{b.replace(/^Q:\s*/, "")}</p>
            : /^A:\s*/.test(b) ? <p key={i} className="a">{b.replace(/^A:\s*/, "")}</p>
              : piece.layout === "poem" ? <p key={i} className="stanza">{b}</p>
                : <p key={i}>{b}</p>)}
    </article>
  );
}

/* The magazine reader: a top bar with tools, the flip-through book with arrows, and a page counter.
   startSlug opens the book at that piece; while reading, the URL follows the piece on screen
   (so sharing or reloading keeps your place). */
export default function Book({ pieces, data, startSlug, preview = false }: {
  pieces: Piece[]; data: BookData; startSlug?: string; /* preview: in the admin, leave the URL and title alone */ preview?: boolean;
}) {
  const [pages, setPages] = useState<Page[] | null>(null);
  useEffect(() => {
    const art = Promise.all(pieces.map(async (p) => ({
      a: await loadOptional(p.illustration), b: await loadOptional(p.illustration2),
      c: await loadOptional(p.illustration3), d: await loadOptional(p.illustration4),
    })));
    loadFonts().then(() => art).then((art) => setPages(buildPages(pieces, art, data)));
  }, [pieces, data]);
  // On mobile (single layout) one page is shown at a time: the filler pages that pair up spreads
  // on desktop would show up as empty sheets there, so they are removed.
  const [single, setSingle] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (orientation: landscape)"); // leafthrough's default spreadQuery
    const update = () => setSingle(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const filler = new Set([BLANK, INSIDE_FRONT, INSIDE_BACK]);
  const visible = useMemo(() => (pages && single ? pages.filter((p) => !filler.has(p.alt ?? "")) : pages), [pages, single]);

  const book = useRef<LeafThroughHandle>(null);
  const startIndex = startSlug ? pieces.findIndex((p) => p.slug === startSlug) : -1;
  const [current, setCurrent] = useState<number>(startIndex);
  const [shown, setShown] = useState<number[]>([0]);
  const [panel, setPanel] = useState<"" | "contents" | "text" | "zoom">("");
  const startPage = useMemo(() => {
    if (!visible || startIndex < 0) return 0;
    return Math.max(0, visible.findIndex((p) => p.piece === startIndex));
  }, [visible, startIndex]);
  useEffect(() => {
    if (!visible) return;
    const p = startPage, last = visible.length - 1;
    // on desktop pages pair up as 1-2, 3-4…; the cover (0) and a last odd page show alone
    setShown(single || p === 0 ? [p] : (p % 2 ? [p, p + 1] : [p - 1, p]).filter((i) => i <= last));
  }, [visible, startPage, single]);

  const onPageChange = (detail: { visiblePages: number[] }) => {
    if (!visible) return;
    setShown(detail.visiblePages);
    const found = detail.visiblePages.map((i) => visible[i]?.piece).find((x) => x !== undefined);
    const index = found ?? -1;
    setCurrent(index);
    if (preview) return;
    const slug = index >= 0 ? pieces[index]?.slug : undefined;
    const url = slug ? `/${slug}` : "/";
    if (location.pathname !== url) history.replaceState(null, "", url);
    document.title = index >= 0 ? `${pieces[index].title.replace(/\n/g, " ")} · ${data.title}` : `${data.title} · Magazine ${data.issue}`;
  };

  // contents panel: the cover plus one thumbnail per piece
  const thumbs = useMemo(() => {
    if (!pages || panel !== "contents") return [];
    return pieces.map((_, i) => {
      const own = pages.filter((p) => p.piece === i);
      return own.length ? thumbnail(own[0].src, own[1]?.src) : "";
    });
  }, [pages, pieces, panel]);
  const cover = useMemo(() => (pages && panel === "contents" ? thumbnail(pages[0].src) : ""), [pages, panel]);
  const goToPiece = (i: number) => {
    const at = visible?.findIndex((p) => p.piece === i) ?? -1;
    if (at >= 0) book.current?.goTo(at);
    setPanel("");
  };
  // zoom: the pages on screen, full size
  const zoomed = useMemo(() => (panel === "zoom" && visible ? shown.map((i) => visible[i]?.src.toDataURL("image/jpeg", 0.92)).filter(Boolean) : []),
    [panel, shown, visible]);

  // Escape closes any panel
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanel(""); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const piece = current >= 0 ? pieces[current] : null;
  const total = visible?.length ?? 0;
  const counter = shown.length > 1 ? `${shown[0] + 1}–${shown[shown.length - 1] + 1}` : `${(shown[0] ?? 0) + 1}`;

  return (
    <div className="reader">
      <header className="topbar">
        <a href="/" className="topbar-name">{data.title}</a>
        <span className="topbar-piece" aria-live="polite">
          {piece ? <>{piece.title.replace(/\n/g, " ")}<span className="topbar-credit"> — {piece.credit || data.author}</span></> : data.tagline}
        </span>
        <nav className="topbar-tools" aria-label="Reader tools">
          <button onClick={() => setPanel("contents")} disabled={!visible}><LayoutGrid size={16} strokeWidth={1.8} aria-hidden="true" /><span>Contents</span></button>
          <button onClick={() => setPanel("text")} disabled={!visible}><AlignLeft size={16} strokeWidth={1.8} aria-hidden="true" /><span>Read as text</span></button>
          <button onClick={() => setPanel("zoom")} disabled={!visible}><ZoomIn size={16} strokeWidth={1.8} aria-hidden="true" /><span>Zoom</span></button>
        </nav>
      </header>

      <div className="book-wrap">
        {visible ? (
          <LeafThrough ref={book} key={single ? "single" : "spread"} pages={visible} startPage={startPage} onPageChange={onPageChange}
            interaction={{ keyboard: "global" }}
            layout="auto" paper={{ sheetGap: 0.001 }} className="book" style={{ display: "block", height: "70dvh" }} />
        ) : (
          <div className="book-loading" style={{ height: "70dvh" }} role="status">
            <div className="book-loading-cover" style={{ background: data.coverColor, color: data.coverInk }}>
              <span>{data.title}</span>
            </div>
            <p>Loading issue {data.issue}…</p>
          </div>
        )}
      </div>

      <div className="page-counter" aria-live="polite">
        {visible ? <>Page {counter} <span>of {total}</span></> : " "}
        <span className="page-counter-issue">Magazine {data.issue} — {data.year}</span>
      </div>

      {panel === "contents" && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Contents" onClick={() => setPanel("")}>
          <div className="overlay-box contents-panel" onClick={(e) => e.stopPropagation()}>
            <header><h2>Contents</h2><button onClick={() => setPanel("")} aria-label="Close"><X size={18} strokeWidth={1.8} aria-hidden="true" /></button></header>
            <ul>
              <li>
                <button onClick={() => { book.current?.goTo(0); setPanel(""); }}>
                  {cover && <img src={cover} alt="" className="thumb single" />}
                  <span><b>Cover</b><small>{data.title} — Magazine {data.issue}</small></span>
                </button>
              </li>
              {pieces.map((p, i) => (
                <li key={i} className={i === current ? "on" : ""}>
                  <button onClick={() => goToPiece(i)}>
                    {thumbs[i] && <img src={thumbs[i]} alt="" className="thumb" />}
                    <span><b>{2 * i + 1}. {p.title.replace(/\n/g, " ")}</b><small>{p.credit || data.author} · {p.label || LABELS[p.layout]}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {panel === "text" && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Text version" onClick={() => setPanel("")}>
          <div className="overlay-box text-view" onClick={(e) => e.stopPropagation()}>
            <header>
              <span>{data.title} · Magazine {data.issue}</span>
              <button onClick={() => setPanel("")} aria-label="Close"><X size={18} strokeWidth={1.8} aria-hidden="true" /></button>
            </header>
            {piece ? <PieceText piece={piece} data={data} /> : (
              <article className="text-view-article">
                <h2>{data.title}</h2>
                <p className="text-view-credit">Magazine {data.issue} — {data.year}</p>
                <ol className="text-view-list">
                  {pieces.map((p, i) => (
                    <li key={i}><button onClick={() => goToPiece(i)}>{p.title.replace(/\n/g, " ")}</button> <small>— {p.credit || data.author}</small></li>
                  ))}
                </ol>
              </article>
            )}
            {piece && (
              <footer>
                <button disabled={current <= 0} onClick={() => goToPiece(current - 1)}><ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />Previous</button>
                <button disabled={current >= pieces.length - 1} onClick={() => goToPiece(current + 1)}>Next<ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" /></button>
              </footer>
            )}
          </div>
        </div>
      )}

      {panel === "zoom" && (
        <div className="overlay zoom" role="dialog" aria-modal="true" aria-label="Zoomed pages" onClick={() => setPanel("")}>
          <button className="zoom-close" onClick={() => setPanel("")} aria-label="Close"><X size={22} strokeWidth={1.8} aria-hidden="true" /></button>
          <div className="zoom-pages">
            {zoomed.map((src, i) => <img key={i} src={src} alt={visible?.[shown[i]]?.alt ?? ""} />)}
          </div>
        </div>
      )}
    </div>
  );
}
