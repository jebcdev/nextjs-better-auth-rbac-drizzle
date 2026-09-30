// src/lib/db/schemas.ts
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { defineRelations } from "drizzle-orm";
import {
    pgTable,
    text,
    boolean,
    timestamp,
    index,
    uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    // Admin plugin: text, NO enum. better-auth almacena multi-rol como CSV
    // (`setRole` acepta `string[]` y los une con ","), y los roles registrados
    // con `ac.newRole()` son abiertos. Un pgEnum no puede representar eso.
    role: text("role").default("user").notNull(),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { mode: "date" }),
    isActive: boolean("is_active").default(true),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        impersonatedBy: text("impersonated_by"),
    },
    (table) => [index("sessions_userId_idx").on(table.userId)],
);

export const accounts = pgTable(
    "accounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("accounts_userId_idx").on(table.userId)],
);

export const verifications = pgTable(
    "verifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("verifications_identifier_idx").on(table.identifier),
    ],
);

// ==========================================
// RELACIONES (defineRelations v2)
// ==========================================
export const relations = defineRelations(
    {
        users,
        sessions,
        accounts,
        verifications,
    },
    (r) => ({
        users: {
            sessions: r.many.sessions({
                from: r.users.id,
                to: r.sessions.userId,
            }),
            accounts: r.many.accounts({
                from: r.users.id,
                to: r.accounts.userId,
            }),
        },
        sessions: {
            user: r.one.users({
                from: r.sessions.userId,
                to: r.users.id,
            }),
        },
        accounts: {
            user: r.one.users({
                from: r.accounts.userId,
                to: r.users.id,
            }),
        },
    }),
);

// ==========================================
// TIPOS INFERIDOS
// ==========================================

// Rol de usuario.
//
// La columna `role` es `text` a propósito: el plugin admin guarda multi-rol
// como CSV (`setRole` acepta `string[]` y los une con ","), de modo que un
// `pgEnum` no podría representar "user,admin". Estos tipos son el conjunto
// conocido en la app, no el dominio cerrado de la base de datos. Para los
// roles dinámicos de `createAccessControl`, añade variantes aquí.
export type UserRole = "admin" | "user" | "guest";

// Auth
export type UsersSelect = InferSelectModel<typeof users>;
export type UsersInsert = InferInsertModel<typeof users>;
export type SessionsSelect = InferSelectModel<typeof sessions>;
export type SessionsInsert = InferInsertModel<typeof sessions>;
export type AccountsSelect = InferSelectModel<typeof accounts>;
export type AccountsInsert = InferInsertModel<typeof accounts>;
export type VerificationsSelect = InferSelectModel<
    typeof verifications
>;
export type VerificationsInsert = InferInsertModel<
    typeof verifications
>;

export type UserWithSessions = UsersSelect & {
    sessions: SessionsSelect[];
};

export type UserWithAccounts = UsersSelect & {
    accounts: AccountsSelect[];
};

// El "perfil completo": usuario + sesiones + cuentas.
//
// ⚠️ TIPO SOLO DE SERVIDOR. `AccountsSelect` y `SessionsSelect` incluyen
// `password`, `accessToken`, `refreshToken`, `idToken` y `sessions.token`.
// Devolver `FullUser` desde una server action a un Client Component serializa
// esas credenciales dentro del payload RSC y las publica en el navegador, donde
// cualquier usuario autenticado puede leerlas en las devtools.
//
// La alternativa segura es `ProfileViewModel`
// (`src/features/private/profile/types/profile-view-model.ts`), que es la
// proyección explícita que `getFullUserInformation` construye antes de
// devolver. La acción además está marcada `server-only`, para que un `import`
// futuro desde el cliente sea un error de build y no una fuga silenciosa.
export type FullUser = UsersSelect & {
    sessions: SessionsSelect[];
    accounts: AccountsSelect[];
};