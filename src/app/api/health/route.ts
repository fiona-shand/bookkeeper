import { prisma } from "@/lib/db";

// Never cached: the whole point is to report the state right now.
export const dynamic = "force-dynamic";

/**
 * This endpoint is public, so nothing that could be a credential may reach the
 * response. Connection URLs and JWT-shaped tokens are stripped.
 */
function redact(message: string): string {
  return message
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"')]+/gi, "[url]")
    // Bare hostnames appear in driver errors without a scheme. The host isn't
    // a credential, but publishing it invites people to knock on it.
    .replace(/\b[\w-]+(\.[\w-]+)*\.(turso\.io|vercel\.app)\b/gi, "[host]")
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]")
    .slice(0, 300);
}

/**
 * Answers "is the database reachable, and does it have the right shape?" from a
 * phone browser, without needing a terminal or a Vercel login.
 */
export async function GET() {
  const started = Date.now();
  const driver = process.env.TURSO_DATABASE_URL ? "libsql" : "file";

  try {
    const [books, users] = await Promise.all([
      prisma.book.count(),
      prisma.user.count(),
    ]);

    return Response.json({
      ok: true,
      database: "reachable",
      driver,
      books,
      users,
      ms: Date.now() - started,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        ok: false,
        database: "unreachable",
        driver,
        // "no such table" here means a migration never reached production.
        // A timeout or auth failure means the database itself is the problem.
        detail: redact(message),
        ms: Date.now() - started,
      },
      { status: 503 },
    );
  }
}
