<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MANDATORY

use always the context7 skill /find-docs , never infer, always ask for any doubt

## Commands

- `pnpm dev` · `pnpm build` · `pnpm start`. `start` is `clear && rm -rf .next && next build && next start`; if the leading `clear` misbehaves, use `pnpm build && pnpm exec next start`.
- Verify a change in this order: `pnpm tsc --noEmit` → `pnpm lint` → `pnpm build`. `pnpm build` also type-checks and needs no database.
- **Every route is dynamic** — `.next/prerender-manifest.json` lists only `/_global-error` and `/favicon.ico` as static. So route props are not pre-resolved, and a route that reads `headers()`/`cookies()` will not error at build time for being uncacheable. Don't reason about a page as if it were statically rendered.
- `pnpm lint` is a bare `eslint` (flat config, whole repo; `eslint.config.mjs` spreads `core-web-vitals` + `typescript`). There is **no** Prettier and no test runner.
- **Lint baseline is 0 errors, 3 warnings**, all in `src/features/private/profile/components/profile-sections.tsx` (`changeEmailAction`, `ChangeEmailSchema`, `ChangeEmailData` imported but unused after the email editor was disabled). Anything beyond that is yours. An earlier note claiming 4 warnings in `(privado)/layout.tsx` and `auth.ts` is stale — those files are clean.
- `pnpm tsc --noEmit` can fail with a **stale `.next/types/validator.ts`** error (`Cannot find module '.../panel/usuarios/page.js'`) after a route is renamed or moved. `.next` is a build artifact, not source: delete it and re-run rather than trying to fix the import.
- `pnpm seed` is destructive: `rm -rf drizzle` → `drizzle-kit generate` → `drizzle-kit migrate` → seeder, and the seeder deletes every row in `verifications`, `accounts`, `sessions`, `users`. It aborts unless `SEED_USERS_PASSWORD` is set and is ≥16 chars, not all digits, and contains none of `password`/`qwertyuiop`/`adminadmin`/`secretsecre`. It creates six accounts (`super@email.com` is the `admin`; the rest are `user`/`guest`).

## Architecture

- Single package. `pnpm-workspace.yaml` only carries pnpm `allowBuilds`, there are no workspace members.
- Stack: Next.js 16.3.6 (App Router, Turbopack), React 19 + React Compiler, Tailwind v4 (no `tailwind.config`; the theme is CSS-first in `src/app/globals.css`), Drizzle `1.0.0-rc.4` (v2 API: `defineRelations`, and `drizzle({ relations })` instead of `schema`), better-auth 1.7.6 with the admin plugin, PostgreSQL via `pg`.
- **No `route.ts` and no `toNextJsHandler` anywhere.** Every better-auth call is a server-side `auth.api.*` from a `"use server"` action, so better-auth's HTTP-layer features never execute — its built-in `rateLimit` would be dead config. See `src/lib/auth/rate-limit.ts` for the in-memory replacement and the accepted limitations.
- Features live in `src/features/{public,private,shared}` and each follows the same shape: `actions/*.action.ts` (every action returns `IGeneralResponse<T>` from `features/shared/types`), `validations/*.schema.ts` (Zod), `components/`, and an `index.ts` barrel per folder. Import through the barrel, not the leaf file.
- `components.json` redirects shadcn into `features/shared/components` (and `.../ui`), so `pnpm dlx shadcn add …` never creates `src/components`. `.vscode/settings.json` also watches `features/shared/components/ui` for the export-all extension.
- UI primitives are **base-ui** (`@base-ui/react`), not Radix: composition uses the `render` prop and `nativeButton`, never `asChild`. shadcn style is `base-maia`. `Combobox`, `Select`, `Avatar` and `Badge` already exist under `features/shared/components/ui`.
- `src/app/error.tsx` is a **full-screen route boundary that takes no props** and renders its own `<main>`. Do not reuse it for an inline/in-grid error state — it would nest a second `main` landmark and silently drop any message. `NoData` (`ui/no-data.tsx`) is the empty state; there is no `Skeleton` primitive yet, so a loading placeholder needs one built.
- Route groups: `(publico)`, `(cuenta)` (redirects to `/` when already authenticated), `(privado)` (redirects to `/iniciar-sesion`). URLs are Spanish: `/iniciar-sesion`, `/registrarse`, `/recuperar-contrasena`, `/restablecer-contrasena`, `/perfil`, `/panel`, `/panel/admin/usuarios`. Two links are already broken — `login-form.tsx` points at `/registro` and `public-header.tsx` at `/panel`.
- `CLAUDE.md` is just `@AGENTS.md`; there is no `.cursor/` or CI config. This file is the only instruction source.

### Roles and authorization

- RBAC is **not implemented yet**: there is no `createAccessControl` module and no `requireActionAccess`. The entire role model is the `users.role` text column plus the `UserRole = "admin" | "user" | "guest"` union in `src/lib/db/schema.ts`. It is deliberately `text`, not a `pgEnum`, because better-auth's admin plugin stores multi-role values as CSV — so a stored value can be `"user,admin"`, and any role filter must match a whole comma-delimited token, never a `%admin%` substring.
- `users.isActive` and `users.banned` are **nullable** booleans. Everything else already reads them by truthiness (`!userExists.isActive || userExists.banned` in `login.action.ts`, `!!userRow.isActive && !userRow.banned` in `session-details.ts`), so `null` means "not usable". In SQL, `eq(col, false)` does **not** match `NULL` — a nullable flag needs an explicit `isNull` arm or rows vanish from the listing.
- The three `/panel/admin/usuarios*` pages gate on `hasRequiredRole(userRole, [process.env.SUPER_ADMIN_ROLE as UserRole])`. That `as UserRole` cast is unchecked: `.env.example` ships `SUPER_ADMIN_ROLE="super_admin"`, which is **not** in the `UserRole` union and which `auth.ts`'s `adminRoles: ["admin"]` and the seeder never assign. Anyone who copies `.env.example` to `.env` verbatim gets a super-admin role that matches nothing, and those three pages redirect everyone to `/panel`. The local `.env` correctly uses `admin`.
- Each of those three pages declares its own `allowedPageRoles` inline. When adding a fourth, declare the allowed roles once in the feature and import it into both the page and any action, so the page guard and the action guard cannot drift.
- `src/lib/auth/session-details.ts` (`getSessionDetails()`) is the project's session primitive: one call returns `isAuthenticated`, `userRole`, `currentUser`, and it already treats an inactive or banned account as no session. Prefer it over re-querying in a new action.

### Users module state

`src/features/private/dashboard/admin/users` is scaffolded but hollow, and the scaffold currently does not build clean:

- `AdminDashboardUsersGrid` and `AdminDashboardUsersGridCard` are both `<h1></h1>` stubs; `actions/` is an empty directory and there are no `queries/`, `types/`, `validations/`, or `constants/` folders.
- `[userId]/page.tsx` contains a stray `asdfasfadsf` literal and a TODO to call a `getUserById` action that does not exist.
- `PrivateDashboardHeader` (new, `dashboard-header.tsx`) is a `"use client"` component whose `action.path` branch wraps a `Link` *inside* a `Button`, producing a nested-interactive `<a>` inside `<button>`. It also has stray blank-line/whitespace formatting. Expect to fix this rather than copy the pattern.
- The grid stubs trip `no-unused-vars` and the pages trip `no-non-null-asserted-optional-chain` (`title={pageData?.title!}` — `pageData` is not optional, so drop the `?.` and `!`). These are the current lint errors; they are pre-existing to any new work in this module.

## Gotchas

- `.gitignore` excludes `drizzle/`, `openspec/` and `.opencode/`. Migrations, OpenSpec artifacts and agent commands are local-only: never commit them, never expect them in a diff, and never trust the checked-out `drizzle/` — its migration still creates a `user_role` enum that `schema.ts` no longer declares, and `schema.ts` has no `pgEnum`. Regenerate with `pnpm seed`; don't hand-edit migration SQL.
- `consoleLogger` (`src/lib/logger/console-logger.ts`) returns early unless `NEXT_PUBLIC_ENVIRONMENT === "development"`. `.env.example` sets that variable but also documents a `LOG_LEVEL` the logger never reads. "My log line never printed" is almost always this.
- Server actions are directly POST-able and do **not** inherit the layout's auth guard. Each action must re-derive its subject from its own session lookup and must never accept a user id parameter.
- Never return a raw DB row from an action to a client component. `FullUser` embeds `accounts.password`, `accessToken`, `refreshToken`, `idToken` and the live `sessions.token`, all of which serialize into the RSC payload. Build an explicit field-by-field DTO inside the action — never via `Pick`/`Omit` (a `Pick` silently grows when a column is added) and never with an object spread. `ProfileViewModel` in `src/features/private/profile/types/` is the reference implementation, and `getFullUserInformation.action.ts` documents why. Emit dates as ISO 8601 strings at the boundary. Do **not** mark such an action `server-only` when a client component must call it — `"use server"` alone is correct there; `server-only` is only for actions no client imports.
- Never log payloads, emails, passwords, tokens or better-auth responses — a reason code plus `error.name` only. The `⚠️` notes in `login.action.ts` and `change-password.action.ts` are the house rule, citing the archived `01-audit-exposed-secrets` audit (hallazgo F-03).
- Keep the login failure surface uniform: every branch (unknown address, inactive/banned, wrong password, rate-limited) returns the identical `CREDENTIAL_ERROR_MESSAGE` **and** pays the dummy scrypt via `spendVerificationTime`. Improving those messages reopens the user-enumeration oracle the file exists to close.
- Paginate in SQL with a **total** ordering. `orderBy(asc(name))` alone is not deterministic when names repeat, and rows duplicate or vanish across page boundaries; add a unique tiebreaker like `asc(id)`.
- Next.js 16 specifics that bite here: `<Suspense>` only engages if the data is awaited in a *child* component — awaiting in the page body suspends before any JSX returns, so the skeleton never shows. For anything else about the framework's current API, the bundled docs win over memory (see the block at the top).

## OpenSpec

- Work is planned as changes in `openspec/changes/<name>/` (`proposal.md`, `design.md`, `tasks.md`, `specs/<capability>/spec.md`). The `openspec` CLI is on `PATH`; `openspec validate <name> --strict` is the gate before considering a change done. Schema is `spec-driven`. Commands and skills live in `.opencode/` (`/opsx-propose`, `/opsx-apply`, …).
- Existing capabilities under `openspec/specs/`: `email`, `profile-view`. Reuse an existing capability's exact path rather than introducing a near-duplicate name.
- Active change: `add-admin-users-grid-pagination` (the admin users grid — pagination, search, role/status filters, card, server action, query hook). Read its `design.md` before building any of it; the numbered decisions there (`D1`–`D16`) already settle the params-type split, the CSV-aware role predicate, the `isNull` arm for nullable flags, the DTO shape, and the inline error state.
- Several code comments cite archived changes that no longer exist on disk (`01-audit-exposed-secrets`, `04-harden-authentication`). Those ⚠️ notes are the surviving record of those decisions; treat them as authoritative.

## Environment

- `.env` is gitignored; start from `.env.example` (Spanish, heavily commented). Required for `pnpm dev`: a reachable Postgres at `DATABASE_URL` and `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Without the secret better-auth falls back to a dev default and fails in production.
- `SEED_USERS_PASSWORD` is only read by `pnpm seed`; Cloudinary keys are only needed for the avatar upload seam, which has no provider wired yet.
- `next-env.d.ts` and `*.tsbuildinfo` are gitignored, and `tsconfig.json` includes `.next/types/**/*.ts` — so route types only exist after a `next dev` or `next build` run.
- Comments, user-facing copy and commit messages are in Spanish; commits follow Conventional Commits (`feat(auth): …`).
