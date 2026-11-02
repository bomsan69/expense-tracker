import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

try {
  // Next.js and docker-compose already populate process.env; this only
  // matters for standalone scripts (db/seed.ts) run outside either.
  process.loadEnvFile(".env");
} catch {
  // .env is optional when the environment already has these variables.
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = mysql.createPool(process.env.DATABASE_URL);

export const db = drizzle(pool, { schema, mode: "default" });
