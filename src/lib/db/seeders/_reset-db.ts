// scripts/reset-db.ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import drizzleDB from "@/lib/db";

async function reset() {
    console.log("💣 Dropping schema public (CASCADE)...");
    await drizzleDB.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await drizzleDB.execute(sql`CREATE SCHEMA public`);
    // Si usas extensiones o permisos especiales, re-aplícalos aquí:
    // await drizzleDB.execute(sql`GRANT ALL ON SCHEMA public TO public`);
    console.log("✅ Schema public recreado.");
    process.exit(0);
}

reset().catch((e) => {
    console.error(e);
    process.exit(1);
});