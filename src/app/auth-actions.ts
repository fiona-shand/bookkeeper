"use server";

import { revalidatePath } from "next/cache";
import {
  MIN_PASSWORD_LENGTH,
  createSession,
  destroySession,
  emailLooksValid,
  hashPassword,
  normaliseEmail,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const name = input.name.trim();
  const email = normaliseEmail(input.email);

  if (name.length === 0) return { ok: false, error: "What should we call you?" };
  if (!emailLooksValid(email)) return { ok: false, error: "That email doesn't look right." };
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) return { ok: false, error: "There's already an account with that email." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(input.password) },
  });

  // Books that predate accounts belong to whoever sets up the first one —
  // otherwise the shelf you already built would be stranded.
  const claimed = await prisma.book.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });

  if (claimed.count > 0) {
    console.log(`claimed ${claimed.count} pre-existing books for ${email}`);
  }

  await createSession(user.id);
  revalidatePath("/");
  return { ok: true };
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = normaliseEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  // Same message either way, so this can't be used to discover which emails
  // have accounts.
  const wrong = { ok: false as const, error: "Email or password is wrong." };

  if (!user) {
    // Still hash something, so a missing account doesn't answer faster.
    await hashPassword(input.password);
    return wrong;
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) return wrong;

  await createSession(user.id);
  revalidatePath("/");
  return { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  await destroySession();
  revalidatePath("/");
  return { ok: true };
}

export async function saveGoodreadsProfile(profileId: string | null): Promise<AuthResult> {
  const { requireUser } = await import("@/lib/auth");
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { goodreadsProfileId: profileId, goodreadsSyncedAt: null },
  });

  revalidatePath("/");
  return { ok: true };
}
