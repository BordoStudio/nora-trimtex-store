import { closeDatabase, connectDatabase } from "../db.js";
import { runMigrations } from "../migrations.js";

const db = connectDatabase();
await runMigrations(db);
console.log("PostgreSQL migrations are up to date");
await closeDatabase();
