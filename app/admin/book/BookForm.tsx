"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveBook } from "../actions";
import type { BookData } from "@/lib/bookData";
import { ColorField } from "../ColorField";
import { Icon } from "../Icon";
import { Palettes } from "./Palettes";
import { FONT_THEMES, contrast } from "@/lib/layouts";

export function BookForm({ data }: { data: BookData }) {
  const [state, action, pending] = useActionState(saveBook, undefined);
  const [c, setC] = useState({ coverColor: data.coverColor, coverInk: data.coverInk, pageColor: data.pageColor, pageInk: data.pageInk, backColor: data.backColor, backInk: data.backInk });
  const pick = (k: keyof typeof c) => (v: string) => setC((x) => ({ ...x, [k]: v }));
  const low = ([["Cover", c.coverColor, c.coverInk], ["Pages", c.pageColor, c.pageInk], ["Back cover", c.backColor, c.backInk]] as const)
    .map(([n, a, b]) => [n, contrast(a, b)] as const).filter(([, r]) => r < 4.5);
  return (
    <div className="admin-box">
      <header className="admin-header">
        <h1>Magazine &amp; design</h1>
        <nav><Link href="/admin" className="admin-button"><Icon name="back" />Back</Link></nav>
      </header>
      <form action={action} className="form">
        <fieldset>
          <legend>Cover</legend>
          <div className="row">
            <label>Masthead (magazine name)<input type="text" name="title" defaultValue={data.title} required /></label>
            <label>Issue<input type="text" name="issue" defaultValue={data.issue} /></label>
          </div>
          <div className="row-2">
            <label>Tagline<input type="text" name="tagline" defaultValue={data.tagline} placeholder="small word in serif" /></label>
            <label>Headline<input type="text" name="headline" defaultValue={data.headline} placeholder="big word in heavy sans" /></label>
          </div>
          <span className="hint">The cover lists every piece&apos;s credit under &ldquo;Feat.&rdquo;</span>
        </fieldset>

        <fieldset>
          <legend>Colors</legend>
          <ColorField name="coverColor" label="Cover" value={data.coverColor} onChange={pick("coverColor")} />
          <ColorField name="coverInk" label="Cover text" value={data.coverInk} onChange={pick("coverInk")} />
          <ColorField name="pageColor" label="Pages" value={data.pageColor} onChange={pick("pageColor")} />
          <ColorField name="pageInk" label="Page text" value={data.pageInk} onChange={pick("pageInk")} />
          <ColorField name="backColor" label="Back cover" value={data.backColor} onChange={pick("backColor")} />
          <ColorField name="backInk" label="Back cover text" value={data.backInk} onChange={pick("backInk")} />
          <ColorField name="backdropColor" label="Background behind the magazine" value={data.backdropColor} />
          <span className="hint">Each piece can override the page colors for its own spread.</span>
          {low.map(([n, r]) => (
            <p key={n} className="warning"><Icon name="warn" size={14} />{n}: low contrast ({r.toFixed(1)}:1), the text may be hard to read.</p>
          ))}
        </fieldset>

        <fieldset>
          <legend>Back cover</legend>
          <label>
            Text
            <textarea name="backText" defaultValue={data.backText} rows={3} className="short" placeholder="A closing line, a website, a colophon…" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Fonts</legend>
          <label>
            Font pairing
            <select name="fontTheme" defaultValue={data.fontTheme}>
              {Object.entries(FONT_THEMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span className="hint">Titles, labels and body text change together, on the pages and the cover.</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Saved palettes</legend>
          <span className="hint">Color pairs offered on every piece, applied with one click.</span>
          <Palettes initial={data.palettes} />
        </fieldset>

        <fieldset>
          <legend>Title page and credits</legend>
          <div className="row">
            <label>Editor / author<input type="text" name="author" defaultValue={data.author} required /></label>
            <label>Year<input type="text" name="year" defaultValue={data.year} inputMode="numeric" /></label>
          </div>
          <label>Images by<input type="text" name="illustrator" defaultValue={data.illustrator} placeholder="name of the photographer or illustrator" /></label>
          <label>Rights line<input type="text" name="rights" defaultValue={data.rights} /></label>
        </fieldset>

        <fieldset>
          <legend>Dedication</legend>
          <label className="check"><input type="checkbox" name="showDedication" defaultChecked={data.showDedication} />Show the dedication</label>
          <label>
            Text
            <textarea name="dedication" defaultValue={data.dedication} rows={4} className="short" placeholder="Whoever you want to dedicate this issue to" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Epigraph</legend>
          <label className="check"><input type="checkbox" name="showEpigraph" defaultChecked={data.showEpigraph} />Show the epigraph</label>
          <label>
            Quote
            <textarea name="epigraph" defaultValue={data.epigraph} rows={4} className="short" placeholder="A few lines to open the issue" />
          </label>
          <label>Quote author<input type="text" name="epigraphAuthor" defaultValue={data.epigraphAuthor} /></label>
        </fieldset>

        <p className="hint">Empty texts show in brackets so you notice they&apos;re missing. Hiding a page also removes its blank facing page.</p>
        {state?.error && <p className="error">{state.error}</p>}
        {state?.ok && !pending && <p className="ok">Saved. The magazine now shows the changes.</p>}
        <div className="actions">
          <Link href="/" className="admin-button" target="_blank"><Icon name="open" />View the magazine</Link>
          <button className="primary" disabled={pending}><Icon name="check" />{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
