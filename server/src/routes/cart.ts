import type { FastifyPluginAsync } from "fastify";
import type { MongoDatabase } from "../mongo.js";
import { hashToken, requireUser } from "../auth.js";
import { config } from "../config.js";

type CartBody = { items: Array<Record<string, unknown>> };

type CartRecord = {
  userId: string;
  items: Array<Record<string, unknown>>;
  countryCode?: string;
  userAgent?: string;
  ipHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export function cartRoutes(db: MongoDatabase): FastifyPluginAsync {
  return async (app) => {
    app.get("/api/v1/cart", async (request) => {
      const user = await requireUser(db, request);
      const cart = await db.collection<CartRecord>("carts").findOne({ userId: user.id }, { projection: { _id: 0, items: 1, updatedAt: 1 } });
      return { data: cart ?? { items: [], updatedAt: null } };
    });

    app.put<{ Body: CartBody }>("/api/v1/cart", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request, reply) => {
      const user = await requireUser(db, request);
      if (!Array.isArray(request.body?.items) || request.body.items.length > 100) return reply.code(400).send({ error: "invalid_cart" });
      const countryCode = String(request.headers["cf-ipcountry"] || "").slice(0, 8) || undefined;
      const userAgent = String(request.headers["user-agent"] || "").slice(0, 500) || undefined;
      const ipHash = hashToken(`${config.PRIVACY_IP_SALT}:${request.ip}`);
      const now = new Date();
      await db.collection<CartRecord>("carts").updateOne(
        { userId: user.id },
        {
          $set: { items: request.body.items, countryCode, userAgent, ipHash, updatedAt: now },
          $setOnInsert: { userId: user.id, createdAt: now },
        },
        { upsert: true },
      );
      return { data: { saved: true } };
    });
  };
}
