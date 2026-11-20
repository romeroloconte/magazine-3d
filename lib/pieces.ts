import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

import { isLayout, type Piece } from "./layouts";
export { LAYOUTS, isLayout, type Layout, type Piece } from "./layouts";

/* A row as stored in the database (what the admin edits) */
export type PieceRow = Piece & { id: number; slug: string; position: number; published: boolean };
export type PieceInput = Omit<PieceRow, "id">;

const DIR = path.join(process.cwd(), "content/pieces");
const COLUMNS = "id, slug, title, body, layout, label, credit, location, illustration, illustration2, illustration3, illustration4, background, ink, position, published";

/* Without DATABASE_URL (e.g. locally) pieces are read from the .md files in content/pieces. */
export const hasDatabase = () => Boolean(process.env.DATABASE_URL);
export const sql = () => neon(process.env.DATABASE_URL!);

let ready: Promise<void> | null = null;
/* Creates the tables the first time and, if empty, imports the existing .md files. */
export function prepareDatabase() {
  ready ??= (async () => {
    const q = sql();
    await q`create table if not exists pieces (
      id serial primary key,
      slug text unique not null,
      title text not null,
      body text not null default '',
      layout text not null default 'poem',
      label text,
      credit text,
      location text,
      illustration text,
      illustration2 text,
      background text,
      ink text,
      position integer not null default 0,
      published boolean not null default true,
      created_at timestamptz not null default now()
    )`;
    // columns added after the first version: safe to run on an existing table
    await q`alter table pieces add column if not exists illustration3 text`;
    await q`alter table pieces add column if not exists illustration4 text`;
    await q`create table if not exists settings (key text primary key, value jsonb not null)`;
    const [{ n }] = (await q`select count(*)::int as n from pieces`) as { n: number }[];
    if (n === 0) {
      for (const [i, f] of readMarkdown().entries()) {
        await q`insert into pieces (slug, title, body, layout, label, credit, location, illustration, illustration2, illustration3, illustration4, background, ink, position)
                values (${f.slug}, ${f.title}, ${f.body}, ${f.layout}, ${f.label}, ${f.credit}, ${f.location},
                        ${f.illustration}, ${f.illustration2}, ${f.illustration3}, ${f.illustration4}, ${f.background}, ${f.ink}, ${i + 1})
                on conflict (slug) do nothing`;
      }
    }
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/* Reads content/pieces/*.md: a front-matter block (key: value) followed by the body */
function readMarkdown(): (Piece & { slug: string })[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(path.join(DIR, file), "utf8").replace(/\r\n/g, "\n");
      const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      const meta: Record<string, string> = {};
      if (m) {
        for (const line of m[1].split("\n")) {
          const [k, ...v] = line.split(":");
          if (k) meta[k.trim()] = v.join(":").trim();
        }
      }
      const or = (k: string) => meta[k] || null;
      return {
        slug: file.replace(/^\d+-/, "").replace(/\.md$/, ""),
        // "\n" in a front-matter title marks a line break in the big title
        title: (meta.title || "untitled").replace(/\\n/g, "\n"),
        body: (m ? m[2] : raw).trim(),
        layout: isLayout(meta.layout) ? meta.layout : "poem",
        label: or("label"),
        credit: or("credit"),
        location: or("location"),
        illustration: or("illustration"),
        illustration2: or("illustration2"),
        illustration3: or("illustration3"),
        illustration4: or("illustration4"),
        background: or("background"),
        ink: or("ink"),
      };
    });
}

const toPiece = (r: Piece): Piece => ({
  slug: r.slug,
  title: r.title, body: r.body, layout: isLayout(r.layout) ? r.layout : "poem",
  label: r.label || null, credit: r.credit || null, location: r.location || null,
  illustration: r.illustration || null, illustration2: r.illustration2 || null,
  illustration3: r.illustration3 || null, illustration4: r.illustration4 || null,
  background: r.background || null, ink: r.ink || null,
});

/* Published pieces, in order, ready for the book. */
export async function getPublishedPieces(): Promise<Piece[]> {
  if (!hasDatabase()) return readMarkdown().map(toPiece);
  await prepareDatabase();
  const rows = (await sql().query(`select ${COLUMNS} from pieces where published order by position, id`)) as PieceRow[];
  return rows.map(toPiece);
}

/* ---- Admin ---- */

export async function listRows(): Promise<PieceRow[]> {
  await prepareDatabase();
  return (await sql().query(`select ${COLUMNS} from pieces order by position, id`)) as PieceRow[];
}

export async function getRow(id: number): Promise<PieceRow | null> {
  await prepareDatabase();
  const r = (await sql().query(`select ${COLUMNS} from pieces where id = $1`, [id])) as PieceRow[];
  return r[0] ?? null;
}

export async function createRow(d: PieceInput) {
  await prepareDatabase();
  await sql()`insert into pieces (slug, title, body, layout, label, credit, location, illustration, illustration2, illustration3, illustration4, background, ink, position, published)
              values (${d.slug}, ${d.title}, ${d.body}, ${d.layout}, ${d.label}, ${d.credit}, ${d.location},
                      ${d.illustration}, ${d.illustration2}, ${d.illustration3}, ${d.illustration4}, ${d.background}, ${d.ink}, ${d.position}, ${d.published})`;
}

export async function updateRow(id: number, d: PieceInput) {
  await prepareDatabase();
  await sql()`update pieces set slug = ${d.slug}, title = ${d.title}, body = ${d.body}, layout = ${d.layout},
              label = ${d.label}, credit = ${d.credit}, location = ${d.location},
              illustration = ${d.illustration}, illustration2 = ${d.illustration2},
              illustration3 = ${d.illustration3}, illustration4 = ${d.illustration4},
              background = ${d.background}, ink = ${d.ink}, position = ${d.position}, published = ${d.published}
              where id = ${id}`;
}

export async function deleteRow(id: number) {
  await prepareDatabase();
  await sql()`delete from pieces where id = ${id}`;
}

/* One published piece by its slug, with its position in the magazine */
export async function getPublishedPiece(slug: string) {
  const pieces = await getPublishedPieces();
  const index = pieces.findIndex((p) => p.slug === slug);
  return index < 0 ? null : { piece: pieces[index], index, pieces };
}

/* Sets the order of every piece at once (admin drag and drop): ids in their new order */
export async function reorderRows(ids: number[]) {
  await prepareDatabase();
  const q = sql();
  await q.transaction(ids.map((id, i) => q`update pieces set position = ${i + 1} where id = ${id}`));
}
