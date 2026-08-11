import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { MongoDatabase } from "../mongo.js";
import { getSessionUser, hashToken } from "../auth.js";
import { config } from "../config.js";

type CartBody = { items: Array<Record<string, unknown>>; locale?: string };

type CartRecord = {
  userId?: string;
  guestId?: string;
  items: Array<Record<string, unknown>>;
  countryCode?: string;
  region?: string;
  city?: string;
  userAgent?: string;
  referrer?: string;
  lastPage?: string;
  locale?: string;
  ipHash: string;
  createdAt: Date;
  updatedAt: Date;
};

const guestIdFrom = (request: FastifyRequest) => {
  const value = String(request.headers["x-guest-id"] || "");
  return /^[A-Za-z0-9_-]{16,80}$/.test(value) ? value : undefined;
};

export function cartRoutes(db: MongoDatabase): FastifyPluginAsync {
  return async (app) => {
    app.get("/api/v1/cart", async (request, reply) => {
      const user = await getSessionUser(db, request);
      const guestId = guestIdFrom(request);
      if (!user && !guestId) return reply.code(401).send({ error: "visitor_required" });
      const filter = user ? { userId: user.id } : { guestId };
      const cart = await db.collection<CartRecord>(user ? "carts" : "guestCarts").findOne(filter, { projection: { _id: 0, items: 1, updatedAt: 1 } });
      return { data: cart ?? { items: [], updatedAt: null } };
    });

    app.put<{ Body: CartBody }>("/api/v1/cart", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request, reply) => {
      const user = await getSessionUser(db, request);
      const guestId = guestIdFrom(request);
      if (!user && !guestId) return reply.code(401).send({ error: "visitor_required" });
      if (!Array.isArray(request.body?.items) || request.body.items.length > 100) return reply.code(400).send({ error: "invalid_cart" });
      const countryCode = String(request.headers["cf-ipcountry"] || "").slice(0, 8) || undefined;
      const region = String(request.headers["cf-region"] || "").slice(0, 120) || undefined;
      const city = String(request.headers["cf-ipcity"] || "").slice(0, 120) || undefined;
      const userAgent = String(request.headers["user-agent"] || "").slice(0, 500) || undefined;
      const referrer = String(request.headers["x-guest-referrer"] || request.headers.referer || "").slice(0, 500) || undefined;
      const lastPage = String(request.headers["x-guest-page"] || "").slice(0, 300) || undefined;
      const locale = String(request.body.locale || "").slice(0, 2) || undefined;
      const ipHash = hashToken(`${config.PRIVACY_IP_SALT}:${request.ip}`);
      const now = new Date();
      const filter = user ? { userId: user.id } : { guestId };
      await db.collection<CartRecord>(user ? "carts" : "guestCarts").updateOne(
        filter,
        {
          $set: { items: request.body.items, countryCode, region, city, userAgent, referrer, lastPage, locale, ipHash, updatedAt: now },
          $setOnInsert: { ...(user ? { userId: user.id } : { guestId }), createdAt: now },
        },
        { upsert: true },
      );
      return { data: { saved: true, anonymous: !user } };
    });
  };
}
