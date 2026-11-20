/* Shared between server and browser (no Node imports here). */

/* Page layouts a piece can use. Each piece takes one double-page spread. */
export const LAYOUTS = {
  photo: "Photo + Photo — an image on each page",
  "text-photo": "Text + Photo — the text on the left, an image on the right",
  "photo-text": "Photo + Text — an image on the left, the text on the right",
  essay: "Text + Text — big title on the left, text in two columns on the right",
  spread: "Full spread — one image across both pages",
  quote: "Quote — one big quote, set large",
  gallery: "Gallery — four images, two on each page",
  interview: "Interview — Q&A on the left, an image on the right",
  opener: "Opener — number, name and title on the left, an image on the right",
  poem: "Poem — an image (or the page number) on the left, the poem on the right",
} as const;
export type Layout = keyof typeof LAYOUTS;

/* What goes on each page. The first four layouts are the plain combinations of text and photo;
   the admin offers them as a Left / Right choice. */
export type Side = "text" | "photo";
export const SPREADS: Record<`${Side}-${Side}`, Layout> = {
  "photo-photo": "photo", "text-photo": "text-photo", "photo-text": "photo-text", "text-text": "essay",
};
export const sidesOf = (l: Layout): [Side, Side] | null =>
  l === "photo" ? ["photo", "photo"] : l === "text-photo" ? ["text", "photo"]
    : l === "photo-text" ? ["photo", "text"] : l === "essay" ? ["text", "text"] : null;

/* How many images each layout shows */
export const IMAGES_PER_LAYOUT: Record<Layout, number> = {
  photo: 2, "text-photo": 1, "photo-text": 1, essay: 0, spread: 1, quote: 0, gallery: 4,
  interview: 1, opener: 1, poem: 1,
};

/* Layouts that show the body text */
export const SHOWS_TEXT: Record<Layout, boolean> = {
  photo: false, "text-photo": true, "photo-text": true, essay: true, spread: false, quote: true, gallery: false,
  interview: true, opener: false, poem: true,
};

export const isLayout = (v: unknown): v is Layout => typeof v === "string" && v in LAYOUTS;

/* What the book needs to draw a piece */
export type Piece = {
  /* URL of the piece: /<slug> (optional in the admin preview) */
  slug?: string;
  title: string;
  body: string;
  layout: Layout;
  /* Section label at the top of the page ("Essay", "Interview"…); null = the layout's name */
  label: string | null;
  /* Who wrote it / who is featured */
  credit: string | null;
  /* Small caption ("City, Country") */
  location: string | null;
  illustration: string | null;
  illustration2: string | null;
  illustration3: string | null;
  illustration4: string | null;
  /* Page colors for this spread; null = the book's colors */
  background: string | null;
  ink: string | null;
};

/* A saved color pair, to apply to a spread with one click */
export type Palette = { name: string; background: string; ink: string };

/* Font pairings the magazine can use (the fonts themselves are loaded in app/layout.tsx) */
export const FONT_THEMES = {
  editorial: "Editorial — Marcellus, Syne, Newsreader",
  classic: "Classic — Playfair Display, Inter, Lora",
  modern: "Modern — DM Serif Display, Space Grotesk, Source Serif",
  grotesk: "Grotesk — Archivo, Archivo Black, IBM Plex Serif",
} as const;
export type FontTheme = keyof typeof FONT_THEMES;

/* A short plain-text description of a piece, for search engines and link previews */
export function describe(p: Piece, fallback: string) {
  const text = p.body.replace(/^##\s+/gm, "").replace(/^[QA]:\s*/gm, "").replace(/\s+/g, " ").trim();
  const base = text || [p.label, p.credit && `by ${p.credit}`, p.location].filter(Boolean).join(" ") || fallback;
  return base.length > 155 ? base.slice(0, 152).replace(/\s+\S*$/, "") + "…" : base;
}

/* WCAG contrast ratio between two #rrggbb colors (1 to 21). 4.5 or more reads well for body text. */
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    const [r, g, bl] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return 21;
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
