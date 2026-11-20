"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, MAX_AGE, isCorrectPassword, createToken, isValidToken } from "@/lib/auth";
import { updateRow, deleteRow, createRow, getRow, listRows, reorderRows, isLayout, type PieceInput } from "@/lib/pieces";
import { DEFAULT_BOOK_DATA, getBookData, saveBookData, type BookData } from "@/lib/bookData";
import { FONT_THEMES, type FontTheme, type Palette } from "@/lib/layouts";

/* Reserved paths: a piece can't use them as its slug. */
const RESERVED = new Set([
  "cover", "contents", "admin", "api", "icon", "apple-icon", "opengraph-image", "sitemap", "robots", "favicon",
]);

async function requireSession() {
  if (!(await isValidToken((await cookies()).get(COOKIE)?.value))) redirect("/admin/login");
}

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD is not set on the server." };
  if (!(await isCorrectPassword(String(form.get("password") ?? "")))) return { error: "Wrong password." };
  (await cookies()).set(COOKIE, await createToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

const toSlug = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const HEX = /^#[0-9a-f]{6}$/i;

function readForm(form: FormData): PieceInput | string {
  const str = (k: string) => String(form.get(k) ?? "").replace(/\r\n/g, "\n").trim();
  const opt = (k: string) => str(k) || null;
  const title = str("title");
  const slug = toSlug(str("slug") || title);
  const layout = str("layout");
  if (!title) return "The title is missing.";
  if (!slug) return "The link is not valid.";
  if (!isLayout(layout)) return "Choose a layout.";
  if (RESERVED.has(slug)) return `"${slug}" is reserved; choose a different link.`;
  // colors only count when "custom colors" is ticked
  const custom = form.get("customColors") === "on";
  const background = custom && HEX.test(str("background")) ? str("background") : null;
  const ink = custom && HEX.test(str("ink")) ? str("ink") : null;
  return {
    title, slug, layout,
    body: str("body"),
    label: opt("label"),
    credit: opt("credit"),
    location: opt("location"),
    illustration: opt("illustration"),
    illustration2: opt("illustration2"),
    illustration3: opt("illustration3"),
    illustration4: opt("illustration4"),
    background, ink,
    position: Number(form.get("position")) || 0,
    published: form.get("published") === "on",
  };
}

function errorMessage(e: unknown) {
  return /unique|duplicate/i.test(String(e)) ? "Another piece already uses that link." : "Couldn't save. Please try again.";
}

export async function savePiece(id: number | null, _: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const data = readForm(form);
  if (typeof data === "string") return { error: data };
  try {
    if (id === null) await createRow(data);
    else await updateRow(id, data);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/", "layout");
  redirect("/admin?saved=1");
}

/* A copy of a piece, saved as a draft right after the original */
export async function duplicatePiece(id: number) {
  await requireSession();
  const row = await getRow(id);
  if (!row) redirect("/admin");
  const slugs = new Set((await listRows()).map((r) => r.slug));
  let slug = `${row.slug}-copy`;
  for (let n = 2; slugs.has(slug); n++) slug = `${row.slug}-copy-${n}`;
  const { id: _, ...rest } = row;
  await createRow({ ...rest, slug, title: `${row.title} (copy)`, published: false, position: row.position });
  revalidatePath("/", "layout");
  redirect("/admin?saved=copy");
}

/* New order from the drag-and-drop list */
export async function reorderPieces(ids: number[]) {
  await requireSession();
  await reorderRows(ids.filter((n) => Number.isInteger(n)));
  revalidatePath("/", "layout");
}

/* Adds a color pair to the saved palettes (offered on every piece) */
export async function savePalette(p: Palette) {
  await requireSession();
  if (!HEX.test(p.background) || !HEX.test(p.ink)) return;
  const book = await getBookData();
  const name = p.name.trim().slice(0, 30) || `${p.background} / ${p.ink}`;
  const palettes = [...book.palettes.filter((x) => x.name !== name), { name, background: p.background, ink: p.ink }];
  await saveBookData({ ...book, palettes });
  revalidatePath("/admin", "layout");
}

export async function deletePiece(id: number) {
  await requireSession();
  await deleteRow(id);
  revalidatePath("/", "layout");
  redirect("/admin");
}

/* Palettes come from the form as repeated fields: paletteName / paletteBackground / paletteInk */
function readPalettes(form: FormData): Palette[] {
  const names = form.getAll("paletteName").map(String);
  const bgs = form.getAll("paletteBackground").map(String);
  const inks = form.getAll("paletteInk").map(String);
  return names.map((name, i) => ({ name: name.trim() || `Palette ${i + 1}`, background: bgs[i], ink: inks[i] }))
    .filter((x) => HEX.test(x.background ?? "") && HEX.test(x.ink ?? ""));
}

export async function saveBook(_: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const t = (k: keyof BookData) => String(form.get(k) ?? "").replace(/\r\n/g, "\n").trim();
  const color = (k: keyof BookData) => (HEX.test(t(k)) ? t(k) : (DEFAULT_BOOK_DATA[k] as string));
  const data: BookData = {
    title: t("title") || DEFAULT_BOOK_DATA.title,
    author: t("author") || DEFAULT_BOOK_DATA.author,
    year: t("year"),
    illustrator: t("illustrator"),
    rights: t("rights"),
    showDedication: form.get("showDedication") === "on",
    dedication: t("dedication"),
    showEpigraph: form.get("showEpigraph") === "on",
    epigraph: t("epigraph"),
    epigraphAuthor: t("epigraphAuthor"),
    issue: t("issue") || DEFAULT_BOOK_DATA.issue,
    tagline: t("tagline"),
    headline: t("headline"),
    coverColor: color("coverColor"),
    coverInk: color("coverInk"),
    pageColor: color("pageColor"),
    pageInk: color("pageInk"),
    backdropColor: color("backdropColor"),
    backColor: color("backColor"),
    backInk: color("backInk"),
    backText: t("backText"),
    fontTheme: (t("fontTheme") in FONT_THEMES ? t("fontTheme") : DEFAULT_BOOK_DATA.fontTheme) as FontTheme,
    palettes: readPalettes(form),
  };
  try {
    await saveBookData(data);
  } catch {
    return { error: "Couldn't save. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
