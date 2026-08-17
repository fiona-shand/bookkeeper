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

If you forget the variables, the deploy **fails loudly** with a message pointing
back here, rather than starting up against a throwaway file and losing your
books on the next push.

## 3. Later schema changes

**Every schema change is two steps, and forgetting the second one takes the site
down.** This has already happened once: the accounts migration ran locally, the
deploy went out, and production kept serving a database with no `User` table —
so every signed-in page load returned a 500 while signed-out visitors saw a
perfectly normal landing page.

```bash
npx prisma migrate dev --name whatever                                  # 1. local
turso db shell bookkeeper ".dump" > backup.sql                          # 2. back up prod
turso db shell bookkeeper < prisma/migrations/<stamp>_whatever/migration.sql   # 3. prod
```

Prisma's migrate CLI doesn't drive libSQL, so step 3 is manual and nothing warns
you when it's skipped. Two habits make that survivable:

- **Check the tables after deploying.** `greatreads.page/api/health` reports
  whether the database is reachable and readable — a missing table shows up
  there as a 503 with the driver's own error.
- **Compare what's applied.** Locally, `ls prisma/migrations`; in production,
  `turso db shell bookkeeper "select migration_name from _prisma_migrations"`.
  Applying SQL by hand does not add a row to that table, so record it yourself
  if you want the two lists to match.

A migration that rebuilds a table (any change to a column or constraint on an
existing model) copies every row into a new table and drops the old one. It is
safe, but it is the reason step 2 exists.

## Before you share the URL

Accounts now exist: every shelf is private to its owner, and every Server Action
checks the session before touching a row. **The first account created on the
deployed site adopts any unclaimed books**, so sign up yourself immediately
after deploying — before anyone else can.

Still missing: email verification, password reset, and rate limiting on sign-in.
Anyone can create an account, which is intended, but there's nothing yet slowing
down someone guessing at passwords.

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
