import { randomUUID } from "node:crypto";
import type { MongoDatabase } from "./mongo.js";
import { config } from "./config.js";
import { hashToken, issueToken, type UserRecord } from "./auth.js";
import { sendEmail, sendOwnerNotification } from "./email.js";
import { partnerApprovalRequestEmail, partnerDecisionEmail } from "./email-templates.js";

type PartnerApprovalTokenRecord = {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  purpose: "approve_partner";
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
};

const APPROVAL_LIFETIME_MS = 7 * 24 * 60 * 60_000;

export async function sendPartnerApprovalRequest(db: MongoDatabase, user: UserRecord) {
  const now = new Date();
  const token = issueToken();
  const recordId = randomUUID();
  await db.collection<PartnerApprovalTokenRecord>("authTokens").updateMany(
    { userId: user.id, purpose: "approve_partner", usedAt: { $exists: false } },
    { $set: { usedAt: now } },
  );
  await db.collection<PartnerApprovalTokenRecord>("authTokens").insertOne({
    id: recordId,
    userId: user.id,
    email: user.email,
    tokenHash: hashToken(token),
    purpose: "approve_partner",
    expiresAt: new Date(now.getTime() + APPROVAL_LIFETIME_MS),
    createdAt: now,
  });
  const approvalUrl = `${config.ADMIN_URL.replace(/\/$/, "")}/approve#token=${encodeURIComponent(token)}`;
  const message = partnerApprovalRequestEmail(user, approvalUrl);
  return sendOwnerNotification({ ...message, idempotencyKey: `partner-approval-${recordId}` });
}

export async function approvePartnerByToken(db: MongoDatabase, token: string) {
  const now = new Date();
  const record = await db.collection<PartnerApprovalTokenRecord>("authTokens").findOneAndUpdate(
    { tokenHash: hashToken(token), purpose: "approve_partner", usedAt: { $exists: false }, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { returnDocument: "before" },
  );
  if (!record) return null;
  const user = await db.collection<UserRecord>("users").findOneAndUpdate(
    { id: record.userId, role: "partner", status: "pending_approval" },
    { $set: { status: "active", approvedAt: now, approvedBy: "email-link", updatedAt: now } },
    { returnDocument: "after" },
  );
  if (!user) return null;
  const message = partnerDecisionEmail(user.locale, user.firstName, true, `${config.STOREFRONT_URL}/${user.locale}`);
  await sendEmail({ to: user.email, ...message, idempotencyKey: `partner-approve-link-${record.id}` }).catch(() => false);
  return user;
}
