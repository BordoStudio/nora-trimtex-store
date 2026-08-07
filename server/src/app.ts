import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config, corsOrigins } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { catalogRoutes } from "./routes/catalog.js";
import { sampleRequestRoutes } from "./routes/sample-requests.js";
import { orderRoutes } from "./routes/orders.js";
import { authRoutes } from "./routes/auth.js";
import { cartRoutes } from "./routes/cart.js";
import { adminRoutes } from "./routes/admin.js";
import type { AppServices } from "./repositories.js";

export async function buildApp(services: AppServices) {
  const app = Fastify({
    logger: config.NODE_ENV !== "test",
    trustProxy: true,
    bodyLimit: 256 * 1024,
    requestIdHeader: "x-request-id",
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Origin is not allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(healthRoutes(services.databaseHealth));
  await app.register(catalogRoutes(services.catalog));
  await app.register(sampleRequestRoutes(services.sampleRequests));
  await app.register(orderRoutes(services.orders));
  if (services.db) {
    await app.register(authRoutes(services.db));
    await app.register(cartRoutes(services.db));
    await app.register(adminRoutes(services.db));
  }

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const possibleStatus = typeof error === "object" && error !== null && "statusCode" in error
      ? Number(error.statusCode)
      : undefined;
    const status = possibleStatus && possibleStatus >= 400 ? possibleStatus : 500;
    reply.code(status).send({
      error: status === 500 ? "internal_server_error" : "invalid_request",
      requestId: request.id,
    });
  });

  return app;
}
