import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

// Cookie-based gate for the Golf Town portal (/golftown). Entirely separate
// from the app's Supabase auth: credentials live in env vars, the session is
// an HMAC token in an httpOnly cookie, and validation happens server-side on
// every portal page render, portal server action, and the upload route.

const COOKIE_NAME = "gt_portal";
const TOKEN_PAYLOAD = "golftown-portal-v1";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sha256(value: string): Buffer {
  return crypto.createHash("sha256").update(value).digest();
}

// Hashing both sides first gives equal-length buffers, which timingSafeEqual
// requires, without leaking length information.
function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

function expectedToken(): string | null {
  const secret = process.env.GOLFTOWN_PORTAL_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(TOKEN_PAYLOAD).digest("hex");
}

export function verifyPortalCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.GOLFTOWN_PORTAL_USER;
  const expectedPass = process.env.GOLFTOWN_PORTAL_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  // Evaluate both so timing doesn't reveal which field was wrong.
  const userOk = safeEqual(username, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  return userOk && passOk;
}

export async function setPortalCookie(): Promise<boolean> {
  const token = expectedToken();
  if (!token) return false;
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/golftown",
  });
  return true;
}

export async function clearPortalCookie(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, "", { maxAge: 0, path: "/golftown" });
}

export async function isPortalAuthed(): Promise<boolean> {
  const token = expectedToken();
  if (!token) return false;
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  return safeEqual(value, token);
}
