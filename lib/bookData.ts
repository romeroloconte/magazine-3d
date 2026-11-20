import { hasDatabase, prepareDatabase, sql } from "./pieces";
import type { FontTheme, Palette } from "./layouts";

/* Data and text for the fixed pages of the magazine, editable from /admin/book. */
export type BookData = {
  title: string;
  author: string;
  year: string;
  illustrator: string;
  rights: string;
  showDedication: boolean;
  dedication: string;
  showEpigraph: boolean;
  epigraph: string;
  epigraphAuthor: string;
  /* Design */
  issue: string;
  /* Cover: a small word in the serif and a big word in the heavy sans (like "Street" / "CEREMONY") */
  tagline: string;
  headline: string;
  coverColor: string;
  coverInk: string;
  /* Back cover: its own colors and a short text */
  backColor: string;
  backInk: string;
  backText: string;
  pageColor: string;
  pageInk: string;
  backdropColor: string;
  fontTheme: FontTheme;
  /* Saved color pairs, offered on every piece */
  palettes: Palette[];
};

/* What is shown until something has been saved. */
export const DEFAULT_BOOK_DATA: BookData = {
  title: "Open Pages",
  author: "Editor name",
  year: "2026",
  illustrator: "",
  rights: "All rights reserved. Sample content for demonstration.",
  showDedication: true,
  dedication: "",
  showEpigraph: true,
  epigraph: "",
  epigraphAuthor: "",
  issue: "01",
  tagline: "Volume",
  headline: "Sample",
  coverColor: "#1c1b1a",
  coverInk: "#f5f4f2",
  backColor: "#1c1b1a",
  backInk: "#f5f4f2",
  backText: "Thank you for reading.",
  pageColor: "#f5f4f2",
  pageInk: "#1c1b1a",
  backdropColor: "#e6e5e3",
  fontTheme: "editorial",
  palettes: [
    { name: "Paper", background: "#f5f4f2", ink: "#1c1b1a" },
    { name: "Ink", background: "#1c1b1a", ink: "#f5f4f2" },
    { name: "Yellow", background: "#ffe600", ink: "#1c1b1a" },
    { name: "Red", background: "#e30613", ink: "#ffffff" },
    { name: "Pink", background: "#f2a7c3", ink: "#1c1b1a" },
    { name: "Blue", background: "#1f4fd1", ink: "#ffffff" },
    { name: "Violet", background: "#6e3fc7", ink: "#ffffff" },
  ],
};

export async function getBookData(): Promise<BookData> {
  if (!hasDatabase()) return DEFAULT_BOOK_DATA;
  await prepareDatabase();
  const r = (await sql()`select value from settings where key = 'book'`) as { value: Partial<BookData> }[];
  return { ...DEFAULT_BOOK_DATA, ...(r[0]?.value ?? {}) };
}

export async function saveBookData(d: BookData) {
  await prepareDatabase();
  const value = JSON.stringify(d);
  await sql()`insert into settings (key, value) values ('book', ${value}::jsonb)
              on conflict (key) do update set value = excluded.value`;
}
