/* An illustration is either a Vercel Blob URL or the name of a file in /public/illustrations. */
export const illustrationSrc = (v: string) => (/^https?:\/\//.test(v) ? v : `/illustrations/${v}`);
