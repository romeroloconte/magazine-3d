/* Admin session: a single password (ADMIN_PASSWORD) and an HMAC-signed cookie.
   Uses Web Crypto so it works the same in middleware and on the server. */

export const COOKIE = "magazine_session";
export const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function hmac(text: string) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function createToken() {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${expires}.${await hmac(`admin.${expires}`)}`;
}

export async function isValidToken(token: string | undefined) {
  if (!token || !process.env.ADMIN_PASSWORD) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  return safeEqual(signature, await hmac(`admin.${expires}`));
}

export async function isCorrectPassword(attempt: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Compare signatures so neither length nor content leaks through timing.
  return safeEqual(await hmac(`pw.${attempt}`), await hmac(`pw.${expected}`));
}
