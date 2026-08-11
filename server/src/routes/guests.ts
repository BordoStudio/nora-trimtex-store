import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { MongoDatabase } from "../mongo.js";
import { hashToken } from "../auth.js";
import { config } from "../config.js";
import { sendOwnerNotification } from "../email.js";

export type GuestSessionRecord = {
  id: string;
  ipHash: string;
  countryCode?: string;
  region?: string;
  city?: string;
  userAgent?: string;
  referrer?: string;
  landingPage?: string;
  lastPage?: string;
  locale?: string;
  createdAt: Date;
  lastSeenAt: Date;
};

export type GuestMessageRecord = {
  id: string;
  guestId: string;
  name?: string;
  contact: string;
  message: string;
  page?: string;
  locale?: string;
  createdAt: Date;
};

const clean = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[\r\n\t]/g, " ").trim().slice(0, max) : "";
const guestIdFrom = (request: FastifyRequest, bodyValue?: unknown) => {
  const value = clean(request.headers["x-guest-id"] || bodyValue, 80);
  return /^[A-Za-z0-9_-]{16,80}$/.test(value) ? value : undefined;
};

async function touchGuest(db: MongoDatabase, request: FastifyRequest, guestId: string, body: { page?: unknown; locale?: unknown; referrer?: unknown }) {
  const now = new Date();
  const page = clean(body.page, 300) || clean(request.headers["x-guest-page"], 300) || undefined;
  const referrer = clean(body.referrer, 500) || clean(request.headers["x-guest-referrer"] || request.headers.referer, 500) || undefined;
  await db.collection<GuestSessionRecord>("guestSessions").updateOne(
    { id: guestId },
    {
      $set: {
        ipHash: hashToken(`${config.PRIVACY_IP_SALT}:${request.ip}`),
        countryCode: clean(request.headers["cf-ipcountry"], 8) || undefined,
        region: clean(request.headers["cf-region"], 120) || undefined,
        city: clean(request.headers["cf-ipcity"], 120) || undefined,
        userAgent: clean(request.headers["user-agent"], 500) || undefined,
        lastPage: page,
        locale: clean(body.locale, 2) || undefined,
        lastSeenAt: now,
      },
      $setOnInsert: { id: guestId, referrer, landingPage: page, createdAt: now },
    },
    { upsert: true },
  );
}

export function guestRoutes(db: MongoDatabase): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: { guestId?: string; page?: string; locale?: string; referrer?: string } }>("/api/v1/guests/session", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
      const guestId = guestIdFrom(request, request.body?.guestId);
      if (!guestId) return reply.code(400).send({ error: "invalid_guest" });
      await touchGuest(db, request, guestId, request.body || {});
      return reply.code(202).send({ data: { tracked: true } });
    });

    app.post<{ Body: { guestId?: string; name?: string; contact?: string; message?: string; page?: string; locale?: string; website?: string } }>("/api/v1/guests/messages", { config: { rateLimit: { max: 6, timeWindow: "10 minutes" } } }, async (request, reply) => {
      if (clean(request.body?.website, 100)) return reply.code(202).send({ data: { accepted: true } });
      const guestId = guestIdFrom(request, request.body?.guestId);
      const contact = clean(request.body?.contact, 200);
      const message = clean(request.body?.message, 1500);
      if (!guestId || contact.length < 5 || message.length < 3) return reply.code(400).send({ error: "invalid_message" });
      await touchGuest(db, request, guestId, request.body || {});
      const record: GuestMessageRecord = {
        id: `CHAT-${randomUUID().slice(0, 8).toUpperCase()}`,
        guestId,
        name: clean(request.body?.name, 120) || undefined,
        contact,
        message,
        page: clean(request.body?.page, 300) || undefined,
        locale: clean(request.body?.locale, 2) || undefined,
        createdAt: new Date(),
      };
      await db.collection<GuestMessageRecord>("guestMessages").insertOne(record);
      const text = [`New Nora TrimTex question ${record.id}`, `Name: ${record.name || "—"}`, `Contact: ${record.contact}`, `Page: ${record.page || "—"}`, "", record.message].join("\n");
      await sendOwnerNotification({ subject: `[Nora TrimTex] Question from ${record.name || record.contact}`, text, idempotencyKey: `chat-${record.id}` }).catch((error) => request.log.error(error, "Chat notification failed"));
      return reply.code(201).send({ data: { id: record.id, status: "received" } });
    });
  };
}
