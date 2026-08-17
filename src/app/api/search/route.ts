import { auth } from "@clerk/nextjs/server";
import { searchBooks } from "@/lib/openlibrary";

/**
 * Proxies Open Library search so the browser never calls it directly. Keeps the
 * User-Agent Open Library asks for attached, and keeps the request on one origin.
 */
export async function GET(request: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchBooks(query);
    return Response.json({ results });
  } catch (error) {
    console.error("Open Library search failed:", error);
    return Response.json(
      { results: [], error: "Couldn't reach Open Library. Check your connection." },
      { status: 502 },
    );
  }
}
