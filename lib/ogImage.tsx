import { ImageResponse } from "next/og";

/* Link-preview image (1200×630) in the magazine's style: masthead, a big title, and the issue line */
export const OG_SIZE = { width: 1200, height: 630 };

export function ogImage({ masthead, title, line, background, ink }: {
  masthead: string; title: string; line: string; background: string; ink: string;
}) {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "64px 80px", background, color: ink, fontFamily: "serif",
      }}>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 2, fontFamily: "sans-serif" }}>{masthead.toUpperCase()}</div>
        <div style={{ fontSize: title.length > 40 ? 76 : 104, lineHeight: 1.02, display: "flex", flexDirection: "column" }}>
          {title.split("\n").map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div style={{ fontSize: 26, letterSpacing: 4, fontFamily: "sans-serif", opacity: 0.7 }}>{line.toUpperCase()}</div>
      </div>
    ),
    OG_SIZE,
  );
}
