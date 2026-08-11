import { buildApp } from "./app.js";
import { closeMongo, connectMongo, initializeMongo } from "./mongo.js";
import { config } from "./config.js";
import { createMongoServices } from "./mongo-repositories.js";
import { ensureAdminUser } from "./auth.js";
import { bootstrapCatalog } from "./bootstrap-catalog.js";

const db = await connectMongo();
await initializeMongo(db);
await bootstrapCatalog(db);
await ensureAdminUser(db);
const app = await buildApp(createMongoServices(db));

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  await closeMongo();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ host: config.HOST, port: config.PORT });
