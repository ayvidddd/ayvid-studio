# Ayvid Studio

An AI creative director: brands chat with agents that generate and edit marketing designs, ad
creatives, and short video ads live on a canvas. Higgsfield is the generation backend.

## Status

**Milestone 1** (this commit): auth, workspace/Brand Kit schema, Brand Kit CRUD. Later
milestones (Higgsfield job system, Studio canvas, agents, billing, motion polish, deploy) land as
the project progresses — see the task list in project history for the full delivery order.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind · shadcn/ui · Prisma 7 (driver adapters) ·
Supabase Postgres + Storage · NextAuth v5 (Auth.js) · Zod · Vitest

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Copy environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in:
   - `DATABASE_URL` / `DIRECT_URL` — from a Supabase project's Database settings. Use the
     **pooled** (port 6543, `?pgbouncer=true`) connection string for `DATABASE_URL` and the
     **direct** (port 5432) connection string for `DIRECT_URL`. Migrations use the direct
     connection; the running app uses the pooled one.
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings → API.
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — a Google Cloud OAuth client with
     `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
   - `EMAIL_SERVER` / `EMAIL_FROM` — any SMTP transport, used for magic-link sign-in.
   - `ANTHROPIC_API_KEY`, `HIGGSFIELD_API_KEY_ID`/`_SECRET` — not required until Milestone 2/4,
     but declared now so `.env.local` doesn't need to change shape later.

   For local development without a Supabase project yet, `pnpm exec prisma dev` spins up a
   throwaway local Postgres and prints a connection string you can use for both `DATABASE_URL`
   and `DIRECT_URL` — useful for testing the schema/migrations before wiring up Supabase, though
   file uploads still need real Supabase Storage credentials.

3. **Create the Supabase Storage bucket**

   In the Supabase dashboard, create a **private** bucket named `brand-assets`. The app reads and
   writes it with the service-role key and serves objects via short-lived signed URLs — it should
   not be public.

4. **Run migrations**

   ```bash
   pnpm exec prisma migrate dev
   ```

5. **Run the app**

   ```bash
   pnpm dev
   ```

## Without real credentials

The app builds and serves its public/auth pages with placeholder env vars (`pnpm build`,
`pnpm dev` both work out of the box). Anything that touches Postgres (sign-up, sign-in, the Brand
Kit page) needs a real `DATABASE_URL`/`DIRECT_URL` at minimum; Google sign-in, magic-link email,
and file uploads need their respective real credentials too.

## Testing

```bash
pnpm test        # vitest run
pnpm test:watch  # vitest --watch
pnpm lint        # eslint
pnpm exec tsc --noEmit
```

Server actions are tested with Prisma/Storage mocked out (see `*.test.ts` next to each action
file) — no live database is required to run the test suite.

## Notable implementation notes

- **Auth**: NextAuth v5 owns all sessions (JWT strategy) via credentials, Google OAuth, and email
  magic links. Supabase is used only for Postgres (through Prisma) and Storage — not Supabase
  Auth — to avoid two systems both claiming to own the session. Middleware (`src/middleware.ts`)
  uses an edge-safe subset of the auth config (`src/lib/auth/edge.ts`) that excludes the Prisma
  adapter/bcrypt/nodemailer, since those aren't Edge-runtime-safe.
- **Workspaces**: a signed-up user gets a personal workspace + empty Brand Kit auto-provisioned
  (`src/lib/workspace/provision.ts`). Workspaces support multiple members with roles
  (`WorkspaceMember`) and email invites (`WorkspaceInvite`) at the schema level; Milestone 1 ships
  no invite-acceptance UI or workspace switcher yet — a user's Brand Kit page operates on their
  earliest membership.
- **Brand Kit**: one Brand Kit per workspace. Uploading a logo re-extracts the palette
  automatically via `node-vibrant`; the palette is then freely editable.
- You'll see a Next.js build warning about `jose`/Edge Runtime in the middleware bundle — that's
  a known, harmless artifact of next-auth's JWT library and doesn't affect behavior.
