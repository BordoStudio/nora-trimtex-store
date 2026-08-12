import type { FastifyPluginAsync } from "fastify";
import type { MongoDatabase } from "../mongo.js";
import { requireAdmin, type UserRecord } from "../auth.js";
import { sendEmail } from "../email.js";
import { partnerDecisionEmail } from "../email-templates.js";
import { config } from "../config.js";
import type { OrderDocument, ProductDocument } from "../domain/types.js";
import { publicAssetUrl } from "../storage/r2.js";
import type { GuestMessageRecord, GuestSessionRecord } from "./guests.js";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type CartRecord = { userId: string; items: unknown[]; countryCode?: string; userAgent?: string; updatedAt: Date };
type SessionRecord = { userId: string; countryCode?: string; region?: string; city?: string; userAgent?: string; referrer?: string; createdAt: Date; lastSeenAt: Date };
type ConnectedAccountRecord = { userId: string; provider: string; providerEmail?: string; displayName?: string; createdAt: Date };
type GuestCartRecord = { guestId?: string; items: unknown[]; updatedAt: Date; lastPage?: string };

const publicUser = (user: UserRecord) => {
  const { passwordHash: _passwordHash, _id: _idValue, ...safe } = user as UserRecord & { _id?: unknown };
  return safe;
};

export function adminRoutes(db: MongoDatabase): FastifyPluginAsync {
  return async (app) => {
    app.get<{ Querystring: { status?: string; role?: string; q?: string; search?: string } }>("/api/v1/admin/users", async (request) => {
      await requireAdmin(db, request);
      const filter: Record<string, unknown> = {};
      if (request.query.status) filter.status = request.query.status;
      if (request.query.role) filter.role = request.query.role;
      const searchValue = (request.query.q || request.query.search)?.trim();
      if (searchValue) {
        const pattern = new RegExp(escapeRegex(searchValue), "i");
        filter.$or = [{ email: pattern }, { firstName: pattern }, { lastName: pattern }, { company: pattern }];
      }
      const users = await db.collection<UserRecord>("users").find(filter, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
      users.sort((a, b) => Number(b.status === "pending_approval") - Number(a.status === "pending_approval"));
      const userIds = users.map((user) => user.id);
      const emails = users.map((user) => user.email);
      const [carts, orderCounts] = await Promise.all([
        db.collection<CartRecord>("carts").find({ userId: { $in: userIds } }, { projection: { _id: 0 } }).toArray(),
        db.collection<OrderDocument>("orders").aggregate<{ _id: string; count: number }>([
          { $match: { "customer.email": { $in: emails } } },
          { $group: { _id: { $toLower: "$customer.email" }, count: { $sum: 1 } } },
        ]).toArray(),
      ]);
      const cartsByUser = new Map(carts.map((cart) => [cart.userId, cart]));
      const ordersByEmail = new Map(orderCounts.map((entry) => [entry._id, entry.count]));
      return { data: { items: users.map((user) => {
        const cart = cartsByUser.get(user.id);
        return {
          ...publicUser(user),
          cartItems: cart?.items.length ?? 0,
          cartUpdatedAt: cart?.updatedAt,
          orders: ordersByEmail.get(user.email.toLowerCase()) ?? 0,
        };
      }) } };
    });

    app.get<{ Params: { id: string } }>("/api/v1/admin/users/:id", async (request, reply) => {
      await requireAdmin(db, request);
      const user = await db.collection<UserRecord>("users").findOne({ id: request.params.id });
      if (!user) return reply.code(404).send({ error: "not_found" });
      const [cart, orders, sessions, connectedAccounts] = await Promise.all([
        db.collection<CartRecord>("carts").findOne({ userId: user.id }, { projection: { _id: 0 } }),
        db.collection<OrderDocument>("orders").find({ "customer.email": user.email }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
        db.collection<SessionRecord>("authSessions").find({ userId: user.id }, { projection: { _id: 0, tokenHash: 0, ipHash: 0 } }).sort({ lastSeenAt: -1 }).limit(30).toArray(),
        db.collection<ConnectedAccountRecord>("connectedAccounts").find({ userId: user.id }, { projection: { _id: 0, userId: 0 } }).sort({ createdAt: -1 }).toArray(),
      ]);
      return { data: { user: publicUser(user), cart: cart ?? { items: [] }, orders, sessions, connectedAccounts } };
    });

    app.patch<{ Params: { id: string }; Body: { action?: "approve" | "reject" | "disable"; status?: "active" | "rejected" | "disabled" } }>("/api/v1/admin/users/:id/status", async (request, reply) => {
      const admin = await requireAdmin(db, request);
      const action = request.body?.action || (request.body?.status === "active" ? "approve" : request.body?.status === "rejected" ? "reject" : request.body?.status === "disabled" ? "disable" : undefined);
      if (!action || !["approve", "reject", "disable"].includes(action)) return reply.code(400).send({ error: "invalid_action" });
      const user = await db.collection<UserRecord>("users").findOne({ id: request.params.id });
      if (!user) return reply.code(404).send({ error: "not_found" });
      if (action === "approve" && user.role !== "partner") return reply.code(400).send({ error: "not_partner" });
      const status = action === "approve" ? "active" : action === "reject" ? "rejected" : "disabled";
      const now = new Date();
      await db.collection<UserRecord>("users").updateOne(
        { id: user.id },
        { $set: { status, approvedAt: action === "approve" ? now : undefined, approvedBy: action === "approve" ? admin.id : undefined, updatedAt: now } },
      );
      if (action === "approve" || action === "reject") {
        const message = partnerDecisionEmail(user.locale, user.firstName, action === "approve", `${config.STOREFRONT_URL}/${user.locale}`);
        await sendEmail({ to: user.email, ...message, idempotencyKey: `partner-${action}-${user.id}` })
          .catch((error) => request.log.error(error, "Partner decision email failed"));
      }
      return { data: { status } };
    });

    app.patch<{ Params: { id: string }; Body: { partnerDiscountPercent?: number } }>("/api/v1/admin/users/:id/pricing", async (request, reply) => {
      await requireAdmin(db, request);
      const discount = Number(request.body?.partnerDiscountPercent);
      if (!Number.isFinite(discount) || discount < 0 || discount > 80) return reply.code(400).send({ error: "invalid_discount" });
      const result = await db.collection<UserRecord>("users").updateOne({ id: request.params.id, role: "partner" }, { $set: { partnerDiscountPercent: discount, updatedAt: new Date() } });
      if (!result.matchedCount) return reply.code(404).send({ error: "partner_not_found" });
      return { data: { partnerDiscountPercent: discount } };
    });

    app.get<{ Querystring: { q?: string; page?: string } }>("/api/v1/admin/products", async (request) => {
      await requireAdmin(db, request);
      const filter: Record<string, unknown> = {};
      if (request.query.q?.trim()) {
        const pattern = new RegExp(escapeRegex(request.query.q.trim()), "i");
        filter.$or = [{ sku: pattern }, { "names.ru": pattern }, { "names.en": pattern }];
      }
      const page = Math.max(1, Number(request.query.page || 1));
      const limit = 1_000;
      const collection = db.collection<ProductDocument>("products");
      const [items, total] = await Promise.all([
        collection.find(filter, { projection: { _id: 0, id: 1, sku: 1, slug: 1, categoryId: 1, names: 1, priceUsd: 1, retailPriceUsd: 1, partnerPriceUsd: 1, status: 1, primaryImageKey: 1, updatedAt: 1 } }).sort({ sku: 1 }).skip((page - 1) * limit).limit(limit).toArray(),
        collection.countDocuments(filter),
      ]);
      return { data: { items: items.map(({ primaryImageKey, ...item }) => ({
        ...item,
        retailPriceUsd: item.retailPriceUsd ?? null,
        partnerPriceUsd: item.partnerPriceUsd ?? item.priceUsd ?? null,
        image: publicAssetUrl(primaryImageKey),
      })), page, total } };
    });

    app.patch<{ Params: { id: string }; Body: { retailPriceUsd?: number | null; partnerPriceUsd?: number | null } }>("/api/v1/admin/products/:id/price", async (request, reply) => {
      await requireAdmin(db, request);
      const normalizePrice = (raw: number | null | undefined) => raw === null || raw === undefined ? null : Number(raw);
      const retailPriceUsd = normalizePrice(request.body?.retailPriceUsd);
      const partnerPriceUsd = normalizePrice(request.body?.partnerPriceUsd);
      if ([retailPriceUsd, partnerPriceUsd].some((price) => price !== null && (!Number.isFinite(price) || price < 0 || price > 1_000_000))) return reply.code(400).send({ error: "invalid_price" });
      const unset: Record<string, ""> = {};
      const set: Record<string, number | Date> = { updatedAt: new Date() };
      if (retailPriceUsd === null) unset.retailPriceUsd = ""; else set.retailPriceUsd = retailPriceUsd;
      if (partnerPriceUsd === null) { unset.partnerPriceUsd = ""; unset.priceUsd = ""; } else { set.partnerPriceUsd = partnerPriceUsd; set.priceUsd = partnerPriceUsd; }
      const result = await db.collection<ProductDocument>("products").updateOne({ id: request.params.id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
      if (!result.matchedCount) return reply.code(404).send({ error: "product_not_found" });
      return { data: { retailPriceUsd, partnerPriceUsd } };
    });

    app.get("/api/v1/admin/guests", async (request) => {
      await requireAdmin(db, request);
      const guests = await db.collection<GuestSessionRecord>("guestSessions").find({}, { projection: { _id: 0, ipHash: 0 } }).sort({ lastSeenAt: -1 }).limit(500).toArray();
      const guestIds = guests.map((guest) => guest.id);
      const [carts, messages, orders, sampleRequests] = await Promise.all([
        db.collection<GuestCartRecord>("guestCarts").find({ guestId: { $in: guestIds } }, { projection: { _id: 0, ipHash: 0 } }).toArray(),
        db.collection<GuestMessageRecord>("guestMessages").find({ guestId: { $in: guestIds } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
        db.collection<OrderDocument>("orders").find({ guestId: { $in: guestIds } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
        db.collection("sampleRequests").find({ guestId: { $in: guestIds } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
      ]);
      const byGuest = <T extends { guestId?: string }>(records: T[]) => records.reduce<Record<string, T[]>>((result, record) => {
        if (record.guestId) (result[record.guestId] ||= []).push(record);
        return result;
      }, {});
      const cartsByGuest = new Map(carts.filter((cart) => cart.guestId).map((cart) => [cart.guestId!, cart]));
      const messagesByGuest = byGuest(messages);
      const ordersByGuest = byGuest(orders);
      const samplesByGuest = byGuest(sampleRequests as Array<{ guestId?: string }>);
      return { data: { items: guests.map((guest) => ({
        ...guest,
        cart: cartsByGuest.get(guest.id) ?? null,
        messages: messagesByGuest[guest.id] ?? [],
        orders: ordersByGuest[guest.id] ?? [],
        sampleRequests: samplesByGuest[guest.id] ?? [],
      })) } };
    });

    app.get("/api/v1/admin/activity", async (request) => {
      await requireAdmin(db, request);
      const sessions = await db.collection<SessionRecord>("authSessions").find({}, { projection: { _id: 0, tokenHash: 0, ipHash: 0 } }).sort({ lastSeenAt: -1 }).limit(200).toArray();
      const users = await db.collection<UserRecord>("users").find({ id: { $in: [...new Set(sessions.map((session) => session.userId))] } }, { projection: { _id: 0, id: 1, email: 1, firstName: 1, lastName: 1 } }).toArray();
      const usersById = new Map(users.map((user) => [user.id, user]));
      return { data: { sessions: sessions.map((session) => ({ ...session, ...usersById.get(session.userId) })) } };
    });
  };
}
