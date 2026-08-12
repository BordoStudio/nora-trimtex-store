import { randomInt, randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import type { MongoDatabase } from "../mongo.js";
import { config } from "../config.js";
import { createSession, getSessionUser, hashPassword, hashToken, normalizeEmail, verifyPassword, type AccountRole, type UserRecord } from "../auth.js";
import { sendEmail, sendOwnerNotification } from "../email.js";
import { verificationEmail } from "../email-templates.js";

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

const verificationCode = () => String(randomInt(100_000, 1_000_000));

async function issueVerificationCode(db: MongoDatabase, user: Pick<UserRecord, "id" | "role" | "email" | "firstName" | "locale">) {
  const now = new Date();
  const code = verificationCode();
  const recordId = randomUUID();
  await db.collection<AuthTokenRecord>("authTokens").updateMany(
    { userId: user.id, purpose: "verify_email", usedAt: { $exists: false } },
    { $set: { usedAt: now } },
  );
  await db.collection<AuthTokenRecord>("authTokens").insertOne({
    id: recordId,
    userId: user.id,
    role: user.role,
    email: user.email,
    tokenHash: hashToken(code),
    purpose: "verify_email",
    expiresAt: new Date(now.getTime() + 15 * 60_000),
    createdAt: now,
  });
  const message = verificationEmail(user.locale, user.firstName, code);
  await sendEmail({ to: user.email, ...message, idempotencyKey: `verify-${recordId}` });
}

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
      await issueVerificationCode(db, user);
      return reply.code(201).send({ data: { status: "email_pending", email, accountType: body.accountType } });
    });

    app.post<{ Body: { token?: string; email?: string; code?: string } }>("/api/v1/auth/verify-email", { config: { rateLimit: { max: 8, timeWindow: "10 minutes" } } }, async (request, reply) => {
      const now = new Date();
      const credential = request.body?.code?.trim() || request.body?.token?.trim() || "";
      const email = request.body?.email ? normalizeEmail(request.body.email) : undefined;
      if (!credential || (request.body?.code && !/^\d{6}$/.test(credential))) return reply.code(400).send({ error: "invalid_or_expired_token" });
      const record = await db.collection<AuthTokenRecord>("authTokens").findOneAndUpdate(
        { tokenHash: hashToken(credential), purpose: "verify_email", usedAt: { $exists: false }, expiresAt: { $gt: now }, ...(email ? { email } : {}) },
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

    app.post<{ Body: { email?: string } }>("/api/v1/auth/resend-verification", { config: { rateLimit: { max: 3, timeWindow: "15 minutes" } } }, async (request, reply) => {
      const email = normalizeEmail(request.body?.email || "");
      if (!email) return reply.code(400).send({ error: "invalid_email" });
      const user = await db.collection<UserRecord>("users").findOne({ email, status: "email_pending" });
      if (user) await issueVerificationCode(db, user);
      return { data: { sent: true } };
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
