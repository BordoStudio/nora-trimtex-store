import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyRequest } from "fastify";
import type { MongoDatabase } from "./mongo.js";
import { config } from "./config.js";

const scrypt = promisify(scryptCallback);

export type AccountRole = "retail" | "partner" | "admin";
export type AccountStatus = "email_pending" | "pending_approval" | "active" | "rejected" | "disabled";
export type AuthUser = {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  firstName: string;
  lastName: string;
  company?: string;
  emailVerifiedAt?: Date;
  partnerDiscountPercent: number;
};

export type UserRecord = AuthUser & {
  passwordHash: string;
  phone?: string;
  country?: string;
  city?: string;
  locale: "en" | "de" | "uk" | "ru";
  approvedAt?: Date;
  approvedBy?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

type SessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipHash: string;
  countryCode?: string;
  region?: string;
  city?: string;
  referrer?: string;
  createdAt: Date;
  lastSeenAt: Date;
};

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const issueToken = () => randomBytes(32).toString("base64url");

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltValue, hashValue] = stored.split(":");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64url");
  const supplied = await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length) as Buffer;
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function bearerToken(request: FastifyRequest): string | undefined {
  const value = request.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : undefined;
}

export async function getSessionUser(db: MongoDatabase, request: FastifyRequest): Promise<AuthUser | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await db.collection<SessionRecord>("authSessions").findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await db.collection<UserRecord>("users").findOne({ id: session.userId }, { projection: { _id: 0, passwordHash: 0 } });
  if (!user) return null;
  await db.collection<SessionRecord>("authSessions").updateOne({ tokenHash }, { $set: { lastSeenAt: new Date() } });
  return user;
}

export async function requireUser(db: MongoDatabase, request: FastifyRequest): Promise<AuthUser> {
  const user = await getSessionUser(db, request);
  if (!user || user.status !== "active") throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  return user;
}

export async function requireAdmin(db: MongoDatabase, request: FastifyRequest): Promise<AuthUser> {
  const user = await requireUser(db, request);
  if (user.role !== "admin") throw Object.assign(new Error("Administrator access required"), { statusCode: 403 });
  return user;
}

export async function createSession(db: MongoDatabase, userId: string, request: FastifyRequest) {
  const token = issueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.AUTH_SESSION_DAYS * 86_400_000);
  const document: SessionRecord = {
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    userAgent: String(request.headers["user-agent"] || "").slice(0, 500) || undefined,
    ipHash: hashToken(`${config.PRIVACY_IP_SALT}:${request.ip}`),
    countryCode: String(request.headers["cf-ipcountry"] || "").slice(0, 8) || undefined,
    region: String(request.headers["cf-region"] || "").slice(0, 120) || undefined,
    city: String(request.headers["cf-ipcity"] || "").slice(0, 120) || undefined,
    referrer: String(request.headers.referer || "").slice(0, 500) || undefined,
    createdAt: now,
    lastSeenAt: now,
  };
  await db.collection<SessionRecord>("authSessions").insertOne(document);
  return { token, expiresAt };
}

export async function ensureAdminUser(db: MongoDatabase): Promise<void> {
  if (!config.ADMIN_EMAIL || !config.ADMIN_BOOTSTRAP_PASSWORD) return;
  const email = normalizeEmail(config.ADMIN_EMAIL);
  const passwordHash = await hashPassword(config.ADMIN_BOOTSTRAP_PASSWORD);
  const now = new Date();
  await db.collection<UserRecord>("users").updateOne(
    { email },
    {
      $set: {
        passwordHash,
        role: "admin",
        status: "active",
        emailVerifiedAt: now,
        partnerDiscountPercent: 0,
        updatedAt: now,
      },
      $setOnInsert: {
        id: randomUUID(),
        email,
        firstName: "Nora",
        lastName: "Administrator",
        locale: "ru",
        createdAt: now,
      },
    },
    { upsert: true },
  );
}
