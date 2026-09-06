# Ayvid Studio

An AI creative director: brands chat with agents that generate and edit marketing designs, ad
creatives, and short video ads live on a canvas. Higgsfield is the generation backend.

## Status

**Milestone 1**: auth, workspace/Brand Kit schema, Brand Kit CRUD.
**Milestone 2**: Higgsfield client with mock mode, the async generation job system, SSE progress
streaming, and a webhook endpoint.
**Milestone 3**: Studio three-panel layout, an editable Konva canvas (text/shape/image layers,
drag/resize/rotate), and persisted version history with undo/redo.
**Milestone 4**: the Designer agent, chatting live in the Studio's right panel — generates and
edits images via Higgsfield, applies the Brand Kit, and materializes results straight onto the
canvas.
**Milestone 5**: the Video Producer joins the same Studio chat under a shared Creative Director
persona — animates a still into a short video with a scrubbable preview timeline, plus curated
motion presets and job-status follow-up.
**Milestone 6**: Copywriter and Campaign Strategist join the same shared chat —
`create_campaign` turns a brief into a full multi-format deliverable set, copy gets saved per
platform with a real banned-word check, and a campaign page exports every format as a PNG (plus a
copy.txt) in one ZIP, all rendered client-side.
**Milestone 7** (this commit): the landing page got GSAP entrance animations, an ambient
`@tsparticles` background, and a "materialize" effect when a generated layer lands on the canvas;
the marketing page is Lighthouse-verified at a **96 performance score**. Credit top-ups now run
through Stripe Checkout (`/billing`) with a webhook that credits the workspace on
`checkout.session.completed`. Milestone 8 (full test suite, Playwright E2E, deploy) is next.

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
   - `HIGGSFIELD_API_KEY_ID`/`_SECRET` — from your Higgsfield dashboard. Leave `HIGGSFIELD_MODE`
     set to `mock` to exercise the full job lifecycle (queued → in_progress → completed) without
     calling the real API or spending credits; set it to `live` once you have real keys. Tests
     always run in mock mode regardless of this setting.
   - `ANTHROPIC_API_KEY` — from the Anthropic Console. Unlike Higgsfield, there's no mock mode
     for the agent chat itself — it's a real Claude API call every time, so the Designer agent
     genuinely does nothing without this key set to a real value.
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — from the Stripe dashboard. No dashboard-side
     Product/Price setup is needed: credit packs are defined in code
     (`src/lib/billing/packs.ts`) and priced inline via Checkout's `price_data`. Point a webhook
     endpoint at `/api/billing/webhook` listening for `checkout.session.completed` and use its
     signing secret for `STRIPE_WEBHOOK_SECRET`. There's no mock mode — `/billing` genuinely can't
     start a checkout without a real `STRIPE_SECRET_KEY`.

   For local development without a Supabase project yet, `pnpm exec prisma dev` spins up a
   throwaway local Postgres and prints a connection string you can use for both `DATABASE_URL`
   and `DIRECT_URL` — useful for testing the schema/migrations before wiring up Supabase, though
   file uploads still need real Supabase Storage credentials.

3. **Create the Supabase Storage buckets**

   In the Supabase dashboard, create two **private** buckets: `brand-assets` and `generations`.
   The app reads and writes both with the service-role key and serves objects via short-lived
   signed URLs — neither should be public. `generations` holds downloaded Higgsfield outputs
   (Higgsfield's own URLs expire after ~7 days, so completed jobs are copied into our storage
   immediately).

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
- **Higgsfield jobs**: `src/lib/higgsfield/client.ts` is a thin, Zod-validated wrapper around
  Higgsfield's async job API (key-pair auth, `queued → in_progress → completed/failed/nsfw/canceled`).
  `src/lib/higgsfield/jobs.ts` owns the app-level lifecycle: creates a `GenerationJob` row, checks
  the workspace's credit balance before spending anything, and on completion downloads every
  output into the `generations` bucket and decrements credits — never links to Higgsfield's own
  (expiring) URLs directly. `HIGGSFIELD_MODE=mock` swaps in an in-memory fake job lifecycle keyed
  by poll count (not wall-clock time), so tests and local dev never make real network calls or
  spend real credits. The credit costs in `PLACEHOLDER_CREDIT_COST` are flat placeholders pending
  Higgsfield's per-model cost-estimate endpoint.
- **Progress delivery**: `GET /api/jobs/[id]/events` is a Server-Sent Events stream that polls
  job status with the backoff Higgsfield recommends (2s → x1.5 → 10s cap, plus jitter) until the
  job reaches a terminal state. `POST /api/higgsfield/webhook` is the faster path when Higgsfield
  reaches us directly — it just re-triggers the same status sync rather than trusting the webhook
  body, since Higgsfield doesn't sign webhook payloads.
- **Studio canvas**: `src/lib/studio/store.ts` is a Zustand store with two tiers of mutation —
  `updateLayerLive` (no history entry, used for continuous drag/resize) and `commitLayerChange`
  (one history entry, used on drag-end/resize-end/add/delete). This keeps a 20-layer drag smooth
  instead of pushing a history snapshot on every mousemove, while undo/redo still lands on
  meaningful checkpoints. Undoing then making a new edit discards the redo branch, standard
  editor semantics. `Design`/`DesignVersion` persist explicit "Save version" checkpoints server-side
  (append-only, `sequence`-ordered) — this is separate from the in-session undo/redo stack, which
  is intentionally client-only and reset on reload.
- Konva requires `window`/canvas APIs, so the canvas is loaded via `next/dynamic(..., { ssr: false })`
  — it can never render during SSR.
- **Designer agent**: `skills/designer/SKILL.md` is the editable system prompt (read from disk at
  request time via `src/lib/agents/skill.ts`, not compiled in — edit it without touching code).
  `src/lib/agents/harness.ts` wraps every tool call with a credit-balance guard, retry-with-backoff
  on transient failures, and structured start/success/error logging with an eval-hook extension
  point. Tools are Vercel AI SDK `tool()` definitions (`src/lib/agents/designer/tools.ts`):
  `generate_image` and `edit_image` create a Higgsfield job and poll it to completion (bounded to
  45s) inside the tool call itself, returning signed image URLs directly in the tool result —
  the chat panel watches for a completed `generate_image`/`edit_image` result and adds it to the
  canvas as a new layer automatically. `apply_brand_kit` re-fetches the Brand Kit on demand.
  `remove_background`, `upscale`, and `outpaint` are registered but honestly report themselves
  unavailable — Higgsfield's public REST API has no documented endpoint for any of the three (only
  `/reve/edit`, a whole-image prompt-guided edit with no masking, exists for "editing" — that's
  what `edit_image` uses; there's no true masked region-edit either). Faking these against
  made-up endpoints would silently break the moment someone tried them for real, so the tools
  exist and say so instead.
- **Video Producer agent**: shares the Studio chat with the Designer under one system prompt —
  `skills/creative-director/SKILL.md` is the shared persona, with `skills/designer/SKILL.md` and
  `skills/video-producer/SKILL.md` appended as capability sections and their tool sets merged into
  one `streamText` call. This is a deliberate simplification versus spinning up separate agent
  sessions per specialist: Claude natively handles picking the right tool across a merged set in
  one call, and the Studio only has one chat panel to route into anyway. `generate_video` follows
  the same poll-inside-the-tool-call pattern as image generation; `list_motions` is a small curated
  set of camera-movement phrases we ship ourselves, not a Higgsfield endpoint — their public API's
  only typed motion parameter takes opaque preset UUIDs with no endpoint to list valid ones, so
  camera movement is really just prompt text. `poll_job` lets the agent follow up on a job that
  didn't finish inside the initial 45s wait (video generation runs long). `reframe` is registered
  but honestly unavailable — Higgsfield's public API has no endpoint that accepts an existing video
  as input at all (confirmed by grepping the full OpenAPI spec for any `video_url`-shaped input;
  there is none). Completed videos land in a bottom preview strip with a custom scrubbable timeline
  (`src/components/studio/video-preview-panel.tsx`) rather than as a Konva canvas layer — video
  doesn't fit the same static layer model as images/text/shapes.
- **Copywriter & Campaign Strategist**: also merged into the same shared chat/tool set —
  `create_campaign` creates a `Campaign` row plus one `Design` per standard format (Meta square,
  TikTok/Story vertical, LinkedIn, Google Display), each sized correctly from the start.
  `save_copy_variant` is the Copywriter's one real piece of business logic: it checks the
  agent-written text against the Brand Kit's banned words *in code*, not just by asking the model
  nicely, and rejects the save with a specific reason if one slips through.
- **Campaign export**: `src/lib/export/render-canvas.ts` renders a saved canvas snapshot to a PNG
  entirely client-side, using vanilla Konva (not react-konva) against an off-screen, detached
  `Stage` — no server-side canvas rendering, no native `canvas` package dependency. A campaign's
  "Export ZIP" button (`src/lib/export/campaign-export.ts`) renders every format's latest saved
  version this way, adds a `copy.txt` of saved copy variants, and zips the result with `jszip`. A
  single design's toolbar has its own "Export PNG" that renders the *live* (possibly unsaved)
  canvas instead. **Known gap, called out rather than hidden:** generated videos aren't included in
  a campaign export — `GenerationJob` rows aren't linked back to a `Design`/`Campaign` in the
  schema, so a completed video only exists in the in-session preview panel + the DB's job history,
  not in a place the export step can look them up. Wiring that association is a reasonable
  fast-follow, not done here.
- You'll see a Next.js build warning about `jose`/Edge Runtime in the middleware bundle — that's
  a known, harmless artifact of next-auth's JWT library and doesn't affect behavior.
- **Motion & landing page**: `src/components/marketing/landing-hero.tsx` and `feature-grid.tsx` use
  GSAP (`useGSAP` + `ScrollTrigger`) for entrance animation; `particle-background.tsx` renders an
  ambient `@tsparticles` field gated by `useSyncExternalStore` on `prefers-reduced-motion` and a
  rough low-power-device heuristic (core count / device memory) so it never runs on hardware or
  preferences that can't afford it. `src/components/studio/layer-node.tsx`'s `useMaterialize()` hook
  tweens a newly-added canvas layer's opacity/scale in with GSAP by animating a plain proxy object
  (Konva nodes expose getter/setter methods, not writable properties, so GSAP can't tween them
  directly). The marketing page (`/`) measures **96 on Lighthouse performance** (verified via the
  Lighthouse CLI against a production build, Edge as the headless browser).
- **Billing**: `src/lib/billing/stripe.ts` is a lazy Stripe client singleton, same pattern as the
  Supabase admin client. `createCheckoutSession` (`src/lib/billing/actions.ts`) creates a Stripe
  Checkout Session priced from a fixed in-code pack list and a `PENDING` `CreditPurchase` row keyed
  by the Checkout Session id in the same call. `POST /api/billing/webhook` verifies the Stripe
  signature against the *raw* request body (Next's route handlers give you that natively — no
  special body-parser config needed) and, on `checkout.session.completed`, calls
  `creditWorkspaceForSession` (`src/lib/billing/checkout-completed.ts`), which is idempotent: it
  no-ops if the matching `CreditPurchase` is already `COMPLETED`, since Stripe can and does redeliver
  the same webhook event more than once.
