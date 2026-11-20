import { Share } from "@/components/Share";
import type { Metadata } from "next";
import { Newsreader, Marcellus, Syne, Playfair_Display, Inter, Lora, DM_Serif_Display, Space_Grotesk, Source_Serif_4, Archivo, Archivo_Black, IBM_Plex_Serif } from "next/font/google";
import { getBookData } from "@/lib/bookData";
import type { FontTheme } from "@/lib/layouts";
import "./globals.css";

/* Fonts (all free, from Google Fonts). Swap them for any you like:
   --serif   body text
   --display flared serif for big titles and page numbers
   --sans    heavy sans for the cover masthead and section labels */
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--serif" });
const display = Marcellus({ subsets: ["latin"], weight: "400", variable: "--display" });
const sans = Syne({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--sans" });

/* The other font pairings (chosen in /admin/book). Not preloaded: only the chosen one is downloaded. */
const playfair = Playfair_Display({ subsets: ["latin"], preload: false, variable: "--f-playfair" });
const inter = Inter({ subsets: ["latin"], preload: false, weight: ["500", "700", "800"], variable: "--f-inter" });
const lora = Lora({ subsets: ["latin"], preload: false, style: ["normal", "italic"], variable: "--f-lora" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], preload: false, weight: "400", variable: "--f-dmserif" });
const grotesk = Space_Grotesk({ subsets: ["latin"], preload: false, weight: ["500", "700"], variable: "--f-grotesk" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], preload: false, style: ["normal", "italic"], variable: "--f-sourceserif" });
const archivo = Archivo({ subsets: ["latin"], preload: false, weight: ["500", "700"], variable: "--f-archivo" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], preload: false, weight: "400", variable: "--f-archivoblack" });
const plex = IBM_Plex_Serif({ subsets: ["latin"], preload: false, weight: ["400", "600"], style: ["normal", "italic"], variable: "--f-plex" });
const extra = [playfair, inter, lora, dmSerif, grotesk, sourceSerif, archivo, archivoBlack, plex].map((f) => f.variable).join(" ");

/* Each pairing maps the three roles to fonts */
const THEMES: Record<Exclude<FontTheme, "editorial">, React.CSSProperties> = {
  classic: { "--display": "var(--f-playfair)", "--sans": "var(--f-inter)", "--serif": "var(--f-lora)" } as React.CSSProperties,
  modern: { "--display": "var(--f-dmserif)", "--sans": "var(--f-grotesk)", "--serif": "var(--f-sourceserif)" } as React.CSSProperties,
  grotesk: { "--display": "var(--f-archivoblack)", "--sans": "var(--f-archivo)", "--serif": "var(--f-plex)" } as React.CSSProperties,
};

const site = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Open Pages · Magazine 01",
  description: "An independent magazine.",
  authors: [{ name: "Editor name" }],
  keywords: ["magazine", "design", "editorial", "independent magazine"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Open Pages · Magazine 01",
    description: "An independent magazine.",
    type: "book",
    locale: "en_US",
    siteName: "Open Pages",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { fontTheme } = await getBookData().catch(() => ({ fontTheme: "editorial" as FontTheme }));
  return (
    <html lang="en" className={`${serif.variable} ${display.variable} ${sans.variable} ${extra}`}>
      <body style={fontTheme === "editorial" ? undefined : THEMES[fontTheme]}>
        <main className="table">{children}<Share /></main>
      </body>
    </html>
  );
}
