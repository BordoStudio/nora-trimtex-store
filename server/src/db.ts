import postgres from "postgres";
import { config } from "./config.js";

export type Database = ReturnType<typeof postgres>;

let database: Database | undefined;

export function connectDatabase(): Database {
  if (database) return database;

  database = postgres(config.DATABASE_URL, {
    max: config.DATABASE_POOL_SIZE,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => undefined,
  });
  return database;
}

export async function checkDatabase(db: Database): Promise<void> {
  await db`select 1 as connected`;
}

export async function closeDatabase(): Promise<void> {
  await database?.end({ timeout: 5 });
  database = undefined;
}
