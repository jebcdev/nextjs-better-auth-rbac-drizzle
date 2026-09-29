// src/lib/db/schemas.ts
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { defineRelations } from "drizzle-orm";
import {
    pgTable,
    pgEnum,
    text,
    boolean,
    timestamp,
    index,
    uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
    "admin",
    "user",
    "guest",
]);

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    role: userRoleEnum("role").default("user").notNull(),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
    isActive: boolean("is_active").default(true),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
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
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
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
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
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

// Enums
export type UserRole = (typeof userRoleEnum.enumValues)[number];

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
