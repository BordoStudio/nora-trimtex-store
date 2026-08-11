import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import type { MongoDatabase } from "../mongo.js";
import { config } from "../config.js";
import { createSession, getSessionUser, hashPassword, hashToken, issueToken, normalizeEmail, verifyPassword, type AccountRole, type UserRecord } from "../auth.js";
import { sendEmail, sendOwnerNotification } from "../email.js";

type RegisterBody = {
  accountType: "retail" | "partner";
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  country?: string;
  city?: string;
  locale: "en" | "de" | "uk" | "ru";
};

type AuthTokenRecord = {
  id: string;
  userId: string;
  role: AccountRole;
  email: string;
  tokenHash: string;
  purpose: "verify_email";
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
};

const copy = {
  ru: { subject: "Подтвердите email — Nora TrimTex", hello: "Здравствуйте", action: "Подтвердить email", note: "Ссылка действует 24 часа." },
  uk: { subject: "Підтвердьте email — Nora TrimTex", hello: "Вітаємо", action: "Підтвердити email", note: "Посилання діє 24 години." },
  de: { subject: "E-Mail bestätigen — Nora TrimTex", hello: "Guten Tag", action: "E-Mail bestätigen", note: "Der Link ist 24 Stunden gültig." },
  en: { subject: "Confirm your email — Nora TrimTex", hello: "Hello", action: "Confirm email", note: "This link is valid for 24 hours." },
} as const;

export function authRoutes(db: MongoDatabase): FastifyPluginAsync {
  return async (app) => {
    app.post<{ Body: RegisterBody }>("/api/v1/auth/register", { config: { rateLimit: { max: 6, timeWindow: "10 minutes" } } }, async (request, reply) => {
      const body = request.body;
      if (!body || !["retail", "partner"].includes(body.accountType) || !body.email || !body.password || body.password.length < 10 || !body.firstName || !body.lastName || (body.accountType === "partner" && !body.company?.trim())) {
        return reply.code(400).send({ error: "invalid_registration" });
      }
      const email = normalizeEmail(body.email);
      if (await db.collection<UserRecord>("users").findOne({ email }, { projection: { _id: 1 } })) {
        return reply.code(409).send({ error: "email_already_registered" });
      }

      const now = new Date();
      const userId = randomUUID();
      const user: UserRecord = {
        id: userId,
        email,
        passwordHash: await hashPassword(body.password),
        role: body.accountType,
        status: "email_pending",
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        phone: body.phone?.trim() || undefined,
        company: body.company?.trim() || undefined,
        country: body.country?.trim() || undefined,
        city: body.city?.trim() || undefined,
        locale: body.locale,
        partnerDiscountPercent: 0,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection<UserRecord>("users").insertOne(user);
      const token = issueToken();
      await db.collection<AuthTokenRecord>("authTokens").insertOne({
        id: randomUUID(),
        userId,
        role: body.accountType,
        email,
        tokenHash: hashToken(token),
        purpose: "verify_email",
        expiresAt: new Date(now.getTime() + 86_400_000),
        createdAt: now,
      });
      const text = copy[body.locale];
      const link = `${config.STOREFRONT_URL}/${body.locale}/account/verify?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: text.subject,
        text: `${text.hello}, ${body.firstName}!\n\n${text.action}: ${link}\n\n${text.note}`,
        html: `<p>${text.hello}, ${body.firstName}!</p><p><a href="${link}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#b99553;color:#30221b;text-decoration:none">${text.action}</a></p><p>${text.note}</p>`,
        idempotencyKey: `verify-${userId}`,
      });
      return reply.code(201).send({ data: { status: "email_pending" } });
    });

    app.post<{ Body: { token: string } }>("/api/v1/auth/verify-email", async (request, reply) => {
      const now = new Date();
      const record = await db.collection<AuthTokenRecord>("authTokens").findOneAndUpdate(
        { tokenHash: hashToken(request.body?.token || ""), purpose: "verify_email", usedAt: { $exists: false }, expiresAt: { $gt: now } },
        { $set: { usedAt: now } },
        { returnDocument: "before" },
      );
      if (!record) return reply.code(400).send({ error: "invalid_or_expired_token" });
      const nextStatus = record.role === "partner" ? "pending_approval" : "active";
      await db.collection<UserRecord>("users").updateOne(
        { id: record.userId },
        { $set: { emailVerifiedAt: now, status: nextStatus, updatedAt: now } },
      );
      if (record.role === "partner") {
        await sendOwnerNotification({ subject: "[Nora TrimTex] New partner approval", text: `Partner ${record.email} confirmed the email and is waiting for approval.\n${config.ADMIN_URL}`, idempotencyKey: `partner-${record.userId}` }).catch(() => false);
      }
      return { data: { status: nextStatus } };
    });

    app.post<{ Body: { email: string; password: string } }>("/api/v1/auth/login", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (request, reply) => {
      const email = normalizeEmail(request.body?.email || "");
      const user = await db.collection<UserRecord>("users").findOne({ email });
      if (!user) return reply.code(404).send({ error: "account_not_found" });
      if (!(await verifyPassword(request.body?.password || "", user.passwordHash))) return reply.code(401).send({ error: "invalid_credentials" });
      if (user.status !== "active") return reply.code(403).send({ error: "account_not_active", status: user.status });
      const session = await createSession(db, user.id, request);
      const now = new Date();
      await db.collection<UserRecord>("users").updateOne({ id: user.id }, { $set: { lastLoginAt: now, updatedAt: now } });
      return { data: { ...session, user: { id: user.id, email: user.email, role: user.role, status: user.status, firstName: user.firstName, lastName: user.lastName } } };
    });

    app.post("/api/v1/auth/logout", async (request) => {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (token) await db.collection("authSessions").deleteOne({ tokenHash: hashToken(token) });
      return { data: { success: true } };
    });

    app.get("/api/v1/auth/me", async (request, reply) => {
      const user = await getSessionUser(db, request);
      if (!user || user.status !== "active") return reply.code(401).send({ error: "unauthorized" });
      return { data: { user } };
    });
  };
}
