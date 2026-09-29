<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MANDATORY

use always the context7 skill /find-docs , never infer, always ask for any doubt

## Commands

- `pnpm dev` · `pnpm build` · `pnpm start`. `start` is `clear && rm -rf .next && next build && next start`; if the leading `clear` misbehaves, use `pnpm build && pnpm exec next start`.
- Verify a change in this order: `pnpm tsc --noEmit` → `pnpm lint` → `pnpm build`. `pnpm build` also type-checks and every route is dynamic (`ƒ`), so it needs no database.
- `pnpm lint` is a bare `eslint` (flat config, whole repo). It has **4 pre-existing warnings** (`(privado)/layout.tsx`, `auth.ts`); 0 errors is the bar, not 0 problems.
- **No test framework is installed.** Verify behavior manually in the browser.
- `pnpm seed` is destructive: `rm -rf drizzle` → `drizzle-kit generate` → `drizzle-kit migrate` → seeder, and the seeder deletes every row in `verifications`, `accounts`, `sessions`, `users`. It aborts unless `SEED_USERS_PASSWORD` is set and is ≥16 chars, not all digits, and contains none of `password`/`qwertyuiop`/`adminadmin`/`secretsecre`.

## Architecture

- Single package. `pnpm-workspace.yaml` only carries pnpm `allowBuilds`, there are no workspace members.
- Stack: Next.js 16.3.6 (App Router, Turbopack), React 19 + React Compiler, Tailwind v4 (no `tailwind.config`; the theme is CSS-first in `src/app/globals.css`), Drizzle `1.0.0-rc.4` (v2 API: `defineRelations`, and `drizzle({ relations })` instead of `schema`), better-auth 1.7.6 with the admin plugin, PostgreSQL via `pg`.
- **No `route.ts` and no `toNextJsHandler` anywhere.** Every better-auth call is a server-side `auth.api.*` from a `"use server"` action, so better-auth's HTTP-layer features never execute — its built-in `rateLimit` would be dead config. See `src/lib/auth/rate-limit.ts` for the in-memory replacement and the accepted limitations.
- Features live in `src/features/{public,private,shared}` and each one follows the same shape: `actions/*.action.ts` (every action returns `IGeneralResponse<T>` from `features/shared/types`), `validations/*.schema.ts` (Zod), `components/`, and an `index.ts` barrel per folder. Import through the barrel, not the leaf file.
- `components.json` redirects shadcn into `features/shared/components` (and `.../ui`), so `pnpm dlx shadcn add …` never creates `src/components`.
- UI primitives are **base-ui** (`@base-ui/react`), not Radix: composition uses the `render` prop and `nativeButton`, never `asChild`. shadcn style is `base-maia`.
- Route groups: `(publico)`, `(cuenta)` (redirects to `/` when already authenticated), `(privado)` (redirects to `/iniciar-sesion`). URLs are Spanish: `/iniciar-sesion`, `/registrarse`, `/recuperar-contrasena`, `/restablecer-contrasena`, `/perfil`. Two links are already broken — `login-form.tsx` points at `/registro` and `public-header.tsx` at `/panel`; neither route exists.
- RBAC is **not implemented yet**: there is no `createAccessControl` module. The entire role model is the `users.role` text column plus the `UserRole = "admin" | "user" | "guest"` union in `src/lib/db/schema.ts`. It is deliberately `text`, not a `pgEnum`, because better-auth's admin plugin stores multi-role values as CSV.
- Comments, user-facing copy and commit messages are in Spanish; commits follow Conventional Commits (`feat(auth): …`).

## Gotchas

- `.gitignore` excludes `drizzle/`, `openspec/` and `.opencode/`. Migrations, OpenSpec artifacts and agent commands are local-only: never commit them, never expect them in a diff, and never trust the checked-out `drizzle/` — its migration still creates a `user_role` enum that `schema.ts` no longer declares. Regenerate with `pnpm seed`; don't hand-edit migration SQL.
- `consoleLogger` (`src/lib/logger/console-logger.ts`) returns early unless `NEXT_PUBLIC_ENVIRONMENT === "development"`. That variable is missing from `.env.example`, which documents a `LOG_LEVEL` the logger does not read. "My log line never printed" is almost always this.
- Server actions are directly POST-able and do **not** inherit the layout's auth guard. Each action must re-derive its subject from its own `auth.api.getSession({ headers: await headers() })` and must never accept a user id parameter.
- Never return a raw DB row from an action to a client component. `FullUser` embeds `accounts.password`, `accessToken`, `refreshToken`, `idToken` and the live `sessions.token`, all of which serialize into the RSC payload. Build an explicit field-by-field DTO inside the action.
- Never log payloads, emails, passwords, tokens or better-auth responses — a reason code plus `error.name` only. The `⚠️` notes in `login.action.ts` and `change-password.action.ts` are the house rule, citing the archived `01-audit-exposed-secrets` audit (hallazgo F-03).
- Keep the login failure surface uniform: every branch (unknown address, inactive/banned, wrong password, rate-limited) returns the identical `CREDENTIAL_ERROR_MESSAGE` **and** pays the dummy scrypt via `spendVerificationTime`. Improving those messages reopens the user-enumeration oracle the file exists to close.
- Next.js 16 specifics that bite here: `<Suspense>` only engages if the data is awaited in a *child* component — awaiting in the page body suspends before any JSX returns, so the skeleton never shows. For anything else about the framework's current API, the bundled docs win over memory (see the block at the top).

## OpenSpec

- Work is planned as changes in `openspec/changes/<name>/` (`proposal.md`, `design.md`, `tasks.md`, `specs/`). The `openspec` CLI is on `PATH`; `openspec validate <name> --strict` is the gate before considering a change done. Commands and skills live in `.opencode/` (`/opsx-propose`, `/opsx-apply`, …).
- Active change: `render-profile-details` (no tasks checked off yet). Read its `design.md` before touching `getFullUserInformation` — it already fixes the decisions (DTO at the action boundary, hand-written DTO type, `.strict()` allowlist, `router.refresh()` after writes).
- Several code comments cite archived changes that no longer exist on disk (`01-audit-exposed-secrets`, `04-harden-authentication`). Those ⚠️ notes are the surviving record of those decisions; treat them as authoritative.

## Environment

- `.env` is gitignored; start from `.env.example` (Spanish, heavily commented). Required for `pnpm dev`: a reachable Postgres at `DATABASE_URL` and `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Without the secret better-auth falls back to a dev default and fails in production.
- `SEED_USERS_PASSWORD` is only read by `pnpm seed`; Cloudinary keys are only needed for the avatar upload seam, which has no provider wired yet.
- `next-env.d.ts` and `*.tsbuildinfo` are gitignored, and `tsconfig.json` includes `.next/types/**/*.ts` — so route types only exist after a `next dev` or `next build` run.
