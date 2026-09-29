// src/lib/db/seeders/index.ts
import "dotenv/config";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import drizzleDB from "..";
import * as schema from "../schema";
import type { UserRole } from "../schema";

// ==========================================
// 00. WIPE DATABASE
// ==========================================
// Solo las tablas que `schema.ts` define hoy (las de auth). El orden respeta
// las claves foráneas: `accounts` y `sessions` cuelgan de `users`, así que se
// borran antes de la fila padre.
async function wipeDatabase() {
    console.log("🧹 Wiping database...\n");

    await drizzleDB.delete(schema.verifications);
    await drizzleDB.delete(schema.accounts);
    await drizzleDB.delete(schema.sessions);
    await drizzleDB.delete(schema.users);

    console.log("✅ Database wiped.\n");
}

// ==========================================
// 01. USERS
// ==========================================
// La contraseña NO se hardcodea: se lee del entorno para que el valor nunca
// quede en un archivo versionado. Ver auditoría
// openspec/changes/01-audit-exposed-secrets/ (hallazgo F-01).
const SEED_PASSWORD = process.env.SEED_USERS_PASSWORD;

if (!SEED_PASSWORD) {
    throw new Error(
        "SEED_USERS_PASSWORD no está definida. Genera una con " +
            "`openssl rand -base64 18` y agrégala a tu .env local. " +
            "Nunca la commitees.",
    );
}

// La cuenta `super@email.com` se crea con rol `admin`. Una contraseña débil
// aquí equivale a un administrador público, así que se rechaza en vez de
// confiar en que el seeder solo se use en local.
//
// La lista NO incluye el valor que se filtró en el pasado: reproducirlo aquí
// reintroduciría en un archivo versionado el mismo secreto que la auditoría
// está eliminando. Ese valor era de 9 dígitos, así que las dos reglas
// generales de abajo ya lo cubren.
const WEAK_PASSWORDS = new Set([
    "password",
    "qwertyuiop",
    "adminadmin",
    "secretsecre",
]);

const isAllDigits = (value: string): boolean => /^\d+$/.test(value);

// Coincidencia por subcadena, no exacta: así también cae "passwordpassword",
// "miAdminAdmin" o cualquier contraseña que solo anteponga algo a un término
// predecible.
const hasWeakTerm = (value: string): boolean =>
    [...WEAK_PASSWORDS].some((weak) => value.toLowerCase().includes(weak));

if (
    SEED_PASSWORD.length < 16 ||
    isAllDigits(SEED_PASSWORD) ||
    hasWeakTerm(SEED_PASSWORD)
) {
    throw new Error(
        "SEED_USERS_PASSWORD es demasiado débil: el seeder crea una cuenta " +
            "con rol `admin`, así que una contraseña adivinable equivale a un " +
            "administrador público. Usa `openssl rand -base64 18` (mínimo " +
            "16 caracteres, no solo dígitos) y no la reutilices en otros " +
            "ambientes.",
    );
}

// Se tipa explícitamente porque `seedUsers` es una function declaration
// (hoisted) y TypeScript no arrastra el narrowing del guard de módulo.
const GENERAL_PASSWORD: string = SEED_PASSWORD;

// `UserRole` viene de `userRoleEnum` en `schema.ts`, así que anotar esta lista
// con ese tipo convierte un rol inexistente en un error de compilación, en vez
// de un fallo de Postgres a mitad del seed. Antes cada fila llevaba su propio
// `as const`, que fijaba el rol como un literal sin comprobar nada: el
// compilador aceptaba "production" y la incompatibilidad solo aparecía al
// escribir contra la columna `role`.
//
// El enum del proyecto es `admin | user | guest`: tres roles, no uno por área.
// Estas seis cuentas son seis personas, no seis roles, así que el reparto es
// por acceso —una sola `admin`, el resto `user` si entra desde dentro de la
// organización y `guest` si entra desde fuera—.
const usersToCreate: ReadonlyArray<{
    role: UserRole;
    name: string;
    email: string;
}> = [
    { role: "admin", name: "Juan Esteban Benjumea Correa", email: "super@email.com" },
    { role: "user", name: "Producción", email: "produccion@email.com" },
    { role: "user", name: "Compras", email: "compras@email.com" },
    { role: "user", name: "Ventas", email: "ventas@email.com" },
    { role: "user", name: "Consultas", email: "consultas@email.com" },
    { role: "guest", name: "Cliente", email: "cliente@email.com" },
];

async function seedUsers() {
    console.log("👤 Seeding users...");

    for (const userData of usersToCreate) {
        const [existing] = await drizzleDB
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.email, userData.email))
            .limit(1);

        if (existing) {
            console.log(`  ⏭️  User ${userData.email} already exists, skipping.`);
            continue;
        }

        const response = await auth.api.signUpEmail({
            body: {
                name: userData.name,
                email: userData.email,
                password: GENERAL_PASSWORD,
                callbackURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            },
            headers: new Headers(),
        });

        // better-auth no conoce las columnas propias del proyecto (su
        // `auth.ts` no declara `user.additionalFields`), así que `role` y
        // `emailVerified` se escriben después del alta, directamente por
        // drizzle. `role` e `isActive` no tienen valor por defecto en la
        // consulta de better-auth, así que se dejan como los define el
        // schema: `isActive` true, `banned` false.
        await drizzleDB
            .update(schema.users)
            .set({ role: userData.role, emailVerified: true })
            .where(eq(schema.users.id, response.user.id));

        console.log(`  ✅ Created user: ${userData.name} (${userData.email}) [${userData.role}]`);
    }
    console.log("🎉 Users seeded successfully!");
}

// ==========================================
// RUNNER
// ==========================================
// `pnpm seed` ejecuta este archivo con `tsx`, así que sin este bloque el
// proceso importaba las funciones y salía sin sembrar nada.
async function main() {
    await wipeDatabase();
    await seedUsers();
}

main().then(
    () => {
        console.log("\n✅ Seed completado.");
        process.exit(0);
    },
    (error: unknown) => {
        console.error("\n❌ Seed falló:", error);
        process.exit(1);
    },
);
