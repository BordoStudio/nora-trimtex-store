import { buildApp } from "./app.js";
import { checkDatabase, closeDatabase, connectDatabase } from "./db.js";
import { config } from "./config.js";
import { runMigrations } from "./migrations.js";
import { createPostgresServices } from "./postgres-repositories.js";
import { ensureAdminUser } from "./auth.js";

const db = connectDatabase();
await checkDatabase(db);
await runMigrations(db);
await ensureAdminUser(db);
const app = await buildApp(createPostgresServices(db));

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  await closeDatabase();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ host: config.HOST, port: config.PORT });
