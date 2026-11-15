import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { relations } from "./schema"; // 👈 importa las RELACIONES, no el schema

const drizzleDB = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL!,
    },
    relations, // ✅ v2: se pasa `relations`, no `schema`
});

export default drizzleDB;