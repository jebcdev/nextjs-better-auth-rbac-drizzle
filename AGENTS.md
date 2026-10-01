<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MANDATORY

use always the context7 skill /find-docs , never infer, always ask for any doubt

# Commands

Scripts in `package.json` are only `dev`, `build`, `start`, `lint`, `seed`. There is **no** `typecheck` script, **no** test runner, **no** Prettier, **no** CI.

- Verification gate, in order: `pnpm tsc --noEmit` → `pnpm lint` → `pnpm build`. `pnpm build` runs TypeScript itself and needs no database. Baseline today: all three clean, zero lint warnings.
- `pnpm start` is `clear && rm -rf .next && next build && next start`. If the leading `clear` misbehaves, use `pnpm build && pnpm exec next start`.
- `pnpm lint` is a bare `eslint` over the whole repo (flat config; `eslint.config.mjs` spreads `core-web-vitals` + `typescript`).
- `pnpm tsc --noEmit` can fail with a **stale `.next/types/validator.ts`** error (`Cannot find module '…/usuarios/page.js'`) after a route is renamed or moved. `.next` is a build artifact, not source: delete it and re-run instead of "fixing" the import.
- `pnpm seed` is destructive and does three things in order: `rm -rf drizzle` → `drizzle-kit generate` → `drizzle-kit migrate` → the seeder. The seeder deletes every row in `verifications`, `accounts`, `sessions`, `users`. It aborts unless `SEED_USERS_PASSWORD` is set, ≥16 chars, not all digits, and contains none of `password`/`qwertyuiop`/`adminadmin`/`secretsecre`. It creates six accounts; `super@email.com` is the only `admin`.
- Schema changes: there is no `db:push`/`db:studio` script. Generate migrations with `drizzle-kit generate` and apply with `drizzle-kit migrate`; a full reset is `src/lib/db/seeders/00-delete-database.sh` (drops/recreates the DB via `psql`, defaults to db `nextjs_rbac_drizzle`) followed by `pnpm seed`.
- `drizzle/`, `openspec/` and `.opencode/` are **gitignored**. Migrations, OpenSpec artifacts and agent commands are local-only: never commit them, never expect them in a diff, and never trust the checked-out `drizzle/` as up to date. Regenerate; never hand-edit migration SQL.

# Architecture

- Single package. `pnpm-workspace.yaml` carries only pnpm `allowBuilds`; there are no workspace members.
- Stack: Next.js 16.3.6 (App Router, Turbopack), React 19 with `reactCompiler: true`, Tailwind v4 (no `tailwind.config`; the theme is CSS-first in `src/app/globals.css`), Drizzle `1.0.0-rc.4` (**v2 API**), better-auth 1.7.6 with the admin plugin, Zod v4, PostgreSQL via `pg`.
- **Every route is dynamic** — the build output lists all 12 as `ƒ (Dynamic)`. Route props are unresolved `Promise`s (`await params`), and a page reading `headers()`/`cookies()` will not fail the build for being uncacheable. Never reason about a page as if it were prerendered.
- Drizzle v2: `src/lib/db/index.ts` passes `relations` (from `./schema`) to `drizzle()`, not `schema`, and relations are declared with `defineRelations`. Schema lives only in `src/lib/db/schema.ts`.
- **No `route.ts` and no `toNextJsHandler` anywhere.** Every better-auth call is a server-side `auth.api.*` from a `"use server"` action, so better-auth's HTTP-layer features never execute — configuring its built-in `rateLimit` would be dead config. `src/lib/auth/rate-limit.ts` is the accepted in-memory replacement, with its limitations documented in-file.
- Features live in `src/features/{public,private,shared}` and each follows the same shape: `actions/*.action.ts` (every action returns `IGeneralResponse<T>` from `features/shared/types`), `validations/*.schema.ts` (Zod), `components/`, `queries/` (TanStack Query hooks + a key factory), and an `index.ts` barrel per subfolder. Import through the barrel, not the leaf file. There is deliberately **no** barrel at `features/private/dashboard/admin/users/` root — import `…/users/actions` and `…/users/components` directly.
- `components.json` points shadcn at `@/features/shared/components` and `…/ui` (style `base-maia`), so `pnpm dlx shadcn add …` never creates `src/components`.
- UI primitives are **base-ui** (`@base-ui/react`), not Radix: compose with `render` and `nativeButton`, **never** `asChild`, and never nest `<Link>` inside `<Button>`. `Combobox`, `Select`, `Avatar`, `Badge` already exist under `features/shared/components/ui`.
- Route groups: `(publico)`, `(cuenta)` (redirects to `/` if already authenticated), `(privado)` (redirects to `/iniciar-sesion`). URLs and UI copy are Spanish: `/iniciar-sesion`, `/registrarse`, `/recuperar-contrasena`, `/restablecer-contrasena`, `/perfil`, `/panel`, `/panel/admin/usuarios`.
- `CLAUDE.md` is just `@AGENTS.md`. There is no `.cursor/` and no CI. This file is the only instruction source.

# Roles and authorization

- `users.role` **is a `pgEnum`** (`userRoleEnum`: `admin | user | guest`) and `UserRole` derives from `(typeof userRoleEnum.enumValues)[number]`. One role per account, whole-value comparison — `eq(users.role, role)` in SQL, `hasRequiredRole` in TS. Never substring-match a role, and never `like`/`ilike` the column: Postgres has no implicit cast between an enum and `~~`, so the query fails at runtime.
- `src/lib/auth/role-guard.ts`'s `hasRequiredRole` is the **only** role guard, and `ADMIN_USERS_ROLES` (`…/admin/users/components/grid/admin-users-roles.constants.ts`) is the single declaration of who may open the directory. All three `/panel/admin/usuarios*` pages and all six actions in that feature's `actions/` import that one constant — a locally declared array is a second copy of the authorization rule and is the thing to avoid.
- `ADMIN_USERS_ROLES` is `[process.env.SUPER_ADMIN_ROLE as UserRole]` — an **unchecked cast**. The only value that actually works is `"admin"`, which must also match `adminRoles: ["admin"]` in `src/lib/auth/auth.ts`; the plugin's check and this guard are separate and a mismatch shows up as a better-auth rejection, not a clean 403. Never import `ADMIN_USERS_ROLES` from a Client Component: only `NEXT_PUBLIC_*` is inlined, so in the browser it is `[undefined]`, and filtering that falsy value out yields `[]` — which `hasRequiredRole` treats as *allow everyone*. An unset env var must keep failing closed.
- `getSessionDetails()` (`src/lib/auth/session-details.ts`) is the session primitive: one call returns `isAuthenticated`, `userRole`, `currentUser`, `currentSession`, `fullUserDetails`, and already treats an inactive or banned account as no session. `userRole` comes from the `users` **row**, not from `session.user.role` (better-auth types `additionalFields.role` as `string`).
- Server actions are directly POST-able and do **not** inherit the page's guard. Every action re-derives its subject from its own `getSessionDetails()` call, re-checks the role with the same helper and constant, and must never accept a subject id as a parameter. Do not collapse that guard chain into a boolean helper — `toggle-user-ban.action.ts` documents why the two-query chain stays inline.
- `banned` / `ban_reason` / `ban_expires` belong to better-auth's admin plugin: write them with `auth.api.banUser` / `unbanUser`, which also revokes the target's live sessions. `isActive` is a project column, so it goes through Drizzle. Setting `banned` with Drizzle yields an *apparent* ban that closes nothing.
- `isActive` and `banned` are **nullable** booleans. The app reads them by truthiness, so `null` means "not usable", but in SQL `eq(col, false)` does not match `NULL` — a filter on *inactive* needs an explicit `isNull` arm or rows vanish (see `statusCondition` in `get-all-users.action.ts`).
- Keep the login failure surface uniform: every branch (unknown address, inactive/banned, wrong password, rate-limited) returns the identical `CREDENTIAL_ERROR_MESSAGE` **and** pays the dummy scrypt via `spendVerificationTime`. Differentiating those messages reopens the user-enumeration oracle the file exists to close.

# Data and client boundary

- Never return a raw DB row from an action to a client component. DTOs are written **field by field** — never `Pick`/`Omit` (a `Pick` silently grows when a column is added) and never a spread. `AdminUserListItem` and `ProfileViewModel` are the reference implementations. Emit dates as ISO 8601 strings at the boundary so no `Date` crosses to the browser. `FullUser` in `schema.ts` is a **server-only** type: it embeds `accounts.password`, the OAuth tokens and `sessions.token`, all of which serialize into the RSC payload.
- `"use server"` alone is right for an action a Client Component calls. Add `server-only` only for actions no client imports — adding it to one that a mutation hook calls breaks the build.
- Actions log through `consoleLogger` with a **reason code plus `error.name` only**. Never log payloads, params, emails, passwords, tokens or better-auth responses: an error's `cause` can carry the request that produced it. (House rule from the archived `01-audit-exposed-secrets` audit, hallazgo F-03.)
- TanStack Query: keys come from a factory (`queries/*.keys.ts`) and the list key is built from **normalized** params, so `?search=` and no `search` are one cache entry. Mutations invalidate the **root** key (`adminUsersKeys.all`) in `onSuccess` only — never `onSettled`, and no optimistic updates that would have to invent an id. The list query uses `placeholderData: (prev) => prev` so pagination doesn't flash the skeleton.
- Pagination is one module: `features/shared/components/ui/pagination`. Read `pagination-usage-guide.md` in that folder before using it. It owns exactly three URL params (`page`, `pageSize`, `search`); the client control and the action call the same `normalizePaginationParams` / `resolvePageSize` / `clampPage`, so they cannot disagree. Use **one** shared `whereClause` for both the count and the page query, and paginate over a **total** order (`orderBy(asc(users.name), asc(users.id))`) — `name` alone is not unique and rows duplicate or vanish across page boundaries.
- Zod is v4: `string({ message })` (not `error`), `z.enum([...], { message })`, issue code `unrecognized_keys`, and `.email()` / `.url()` as string methods. Use `.strict()` on privileged action bodies so a smuggled `role`, `isActive`, `banned` or `tenantId` is a visible validation error rather than a silent drop. Password rules are deliberately **duplicated** between `public/auth` and the admin create-user schema (private features must not import from the public feature boundary) — if you change one, change both, or the policy stops being a policy.
- base-ui's `SelectContent` is portalled and only mounted while the popup is open, so `SelectValue` falls back to the raw value ("all", "admin") when closed. Pass `items` (value→label) — see `ADMIN_USERS_ROLE_ITEMS`.
- Next.js 16 specifics that bite here: `<Suspense>` only engages if the awaited data lives in a **child** component; awaiting in the page body suspends before any JSX returns, so the skeleton never shows. `src/app/error.tsx` is a full-screen route boundary that takes no props and renders its own `<main>` — never reuse it for an inline or in-grid error state (use an inline block, or `NoData` for empty), or you nest a second `main` landmark and drop the message. Route props are `Promise`s.

# Environment

- `.env` is gitignored; start from `.env.example` (Spanish, heavily commented, and the authoritative list of variables). Required for `pnpm dev`: a reachable Postgres at `DATABASE_URL` and `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). Without the secret better-auth falls back to a dev default and fails in production.
- `SEED_USERS_PASSWORD` is read only by `pnpm seed`. Cloudinary keys are only needed for the avatar upload seam. Without `MAILTRAP_API_TOKEN`, email delivery is a **silent no-op**: the auth flows still complete and no mail is sent.
- `consoleLogger` (`src/lib/logger/console-logger.ts`) returns early unless `NEXT_PUBLIC_ENVIRONMENT === "development"`. `LOG_LEVEL` in `.env.example` gates nothing in this repo — "my log line never printed" is almost always the former.
- `tsconfig.json` includes `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`, so route types only exist after a `next dev` or `next build` run. `next-env.d.ts` and `*.tsbuildinfo` are gitignored.
- Comments, user-facing copy and commit messages are all in **Spanish**; commits follow Conventional Commits (`feat(auth): …`, `refactor(profile): …`).

# Known defects — don't copy these patterns

- `features/private/dashboard/components/dashboard-header.tsx` still nests a `<Link>` inside a `<Button>` for its `action.path` branch (interactive element inside another). The correct base-ui form is `render={<Link href=… />}`; see `[userId]/page.tsx` for the fixed version.
- `login-form.tsx` links to `/registro`; the real route is `/registrarse`. `public-header.tsx` links to `/panel` from a public page.
- The comment block in `src/lib/db/schema.ts` (just above the inferred types) claims `role` is `text` to support multi-role CSV. That is **stale** — the column is a `pgEnum` and the code is right; ignore the comment.
- `private/dashboard/admin/users/index.ts` was deleted; a barrel at the feature root is not the convention.

# OpenSpec

- Work is planned as changes in `openspec/changes/<name>/` (`proposal.md`, `design.md`, `tasks.md`, `specs/<capability>/spec.md`); a `design.md` exists for the non-obvious decisions, and archived changes map onto the `feat(...)`/`refactor(...)` commits. Schema is `spec-driven`; `openspec/config.yaml`'s `context` / `rules` blocks are still empty templates. The `openspec` CLI is on `PATH` and `openspec validate <name> --strict` is the gate before a change is done. Commands and skills live in `.opencode/` (`/opsx-propose`, `/opsx-apply`, `/opsx-update`, `/opsx-sync`, `/opsx-archive`, `/opsx-explore`).
- **There is no active change** — everything sits in `openspec/changes/archive/`. Synced capabilities under `openspec/specs/`: `email`, `profile-view`, `user-management`, `user-role-model`. Reuse an existing capability's exact path instead of introducing a near-duplicate name.
- Read a change's `design.md` before implementing it: the numbered `D<n>` decisions there already settle the params split, the DTO shape, the `isNull` arms and the cache-invalidation policy. Several code comments cite archived changes that no longer exist on disk (`01-audit-exposed-secrets`, `04-harden-authentication`); those `⚠️` notes are the surviving record of those decisions — treat them as authoritative.
