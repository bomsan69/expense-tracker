import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

try {
  // Next.js and docker-compose already populate process.env; this only
  // matters for standalone scripts (db/seed.ts) run outside either.
  process.loadEnvFile(".env");
} catch {
  // .env is optional when the environment already has these variables.
}

type Db = MySql2Database<typeof schema>;

let instance: Db | null = null;

// Every authenticated page transitively imports this module, and Next
// evaluates that import graph at build time to collect page config — before
// any request, and without DATABASE_URL (the Docker build stage must not
// bake it in). Deferring pool creation to first real use keeps the build
// from needing it, while still failing fast the first time a request
// actually needs the database.
function getDb(): Db {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const pool = mysql.createPool(process.env.DATABASE_URL);
    instance = drizzle(pool, { schema, mode: "default" });
  }
  return instance;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
