# Deploying to Vercel

## The one thing that has to change

The app stores everything in SQLite at `prisma/dev.db`. That works beautifully
on your laptop and **cannot work on Vercel**: serverless functions get an
ephemeral filesystem, so the file is wiped on every deploy and isn't shared
between requests. Your books would vanish, repeatedly.

The fix is a hosted database. Rather than move to Postgres — which would mean
rewriting the schema and losing the books you've already imported — this uses
**Turso**, which is hosted SQLite (libSQL). Same schema, same migrations, same
SQL, and it can import your existing database file directly.

`src/lib/db.ts` picks its adapter automatically: it uses the local file unless
`TURSO_DATABASE_URL` is set, so your laptop setup keeps working untouched.

## 1. Create the database from the one you already have

```bash
brew install tursodatabase/tap/turso
turso auth signup

# Uploads your current shelf — books, ratings, reviews and all.
turso db create bookkeeper --from-file prisma/dev.db

turso db show bookkeeper --url        # → libsql://bookkeeper-....turso.io
turso db tokens create bookkeeper     # → a long token
```

Creating it `--from-file` means the schema and your data arrive together, so
there's no migration step for the first deploy.

## 2. Push to Vercel

Import `fiona-shand/bookkeeper` at [vercel.com/new](https://vercel.com/new).
Framework detection and build command need no changes — `postinstall` already
runs `prisma generate`.

Add two Environment Variables (all three environments):

| Name | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | the `libsql://…` URL from step 1 |
| `TURSO_AUTH_TOKEN` | the token from step 1 |

Deploy.

## 3. Later schema changes

Migrations still run against your local file:

```bash
npx prisma migrate dev --name whatever   # local
```

To apply the same change to production, run the generated SQL against Turso:

```bash
turso db shell bookkeeper < prisma/migrations/<timestamp>_whatever/migration.sql
```

Not elegant — Prisma's migrate CLI doesn't drive libSQL directly yet — but it's
the same SQL either way, so nothing can drift silently.

## Before you share the URL

**There is no authentication.** Every Server Action is callable by anyone who
can reach the site, so a stranger could add, edit or delete your books. On
localhost that doesn't matter. On a public URL it does.

Sign-in is the next thing to build. Until it exists, treat the deployed site as
public and writable.

Two smaller things:

- Put a real contact address in `USER_AGENT` in `src/lib/openlibrary.ts` and
  `src/lib/goodreads.ts`. Open Library asks for one, and it's what keeps you on
  the higher rate limit.
- Goodreads and Open Library are both called from the server, so no CORS
  problems — but a Goodreads import of 100 books takes ~35 seconds, which is
  longer than Vercel's default function timeout on the Hobby plan. The import
  runs in batches of four from the browser, so each individual request is
  short and this should be fine; if you hit a timeout, lower `BATCH_SIZE` in
  `src/components/ImportGoodreads.tsx`.
