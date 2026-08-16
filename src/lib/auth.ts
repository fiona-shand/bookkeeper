import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { MIN_PASSWORD_LENGTH } from "./auth-constants";
import { prisma } from "./db";

/**
 * Session auth, built on node:crypto.
 *
 * Deliberately small: no OAuth provider to register, nothing to configure, and
 * it works on localhost the moment you clone. What it does NOT have is email
 * verification, password reset, or login rate limiting — see the README before
 * this faces anything hostile.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const COOKIE = "bookkeeper_session";
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;

export { MIN_PASSWORD_LENGTH };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = await scryptAsync(
    password.normalize("NFKC"),
    Buffer.from(saltHex, "hex"),
    KEY_LENGTH,
  );

  if (expected.length !== derived.length) return false;
  // Constant-time: a plain === leaks how much of the hash matched.
  return timingSafeEqual(derived, expected);
}

/**
 * Only the hash of the token is stored, so a stolen database can't be replayed
 * as a set of live logins.
 */
function tokenId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { id: tokenId(token), userId, expiresAt },
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  goodreadsProfileId: string | null;
  goodreadsSyncedAt: Date | null;
};

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: tokenId(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    goodreadsProfileId: session.user.goodreadsProfileId,
    goodreadsSyncedAt: session.user.goodreadsSyncedAt,
  };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  if (token) {
    await prisma.session.delete({ where: { id: tokenId(token) } }).catch(() => {});
  }

  jar.delete(COOKIE);
}

/**
 * Every mutation goes through this. Without it a Server Action is a public
 * endpoint — they're reachable by direct POST, not just from our own UI.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  return user;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
