import { MongoClient, type Db } from "mongodb";
import { config } from "./config.js";

export type MongoDatabase = Db;

let client: MongoClient | undefined;

export async function connectMongo(): Promise<MongoDatabase> {
  if (!client) {
    client = new MongoClient(config.MONGODB_URI, {
      maxPoolSize: config.DATABASE_POOL_SIZE,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 12_000,
      retryReads: true,
      retryWrites: true,
    });
    await client.connect();
  }
  return client.db(config.MONGODB_DATABASE);
}

export async function initializeMongo(db: MongoDatabase): Promise<void> {
  await db.command({ ping: 1 });
  await Promise.all([
    db.collection("products").createIndexes([
      { key: { id: 1 }, unique: true, name: "products_id_unique" },
      { key: { slug: 1 }, unique: true, name: "products_slug_unique" },
      { key: { status: 1, categoryId: 1, isNew: -1, updatedAt: -1 }, name: "products_catalog" },
      { key: { sku: 1 }, name: "products_sku" },
    ]),
    db.collection("categories").createIndexes([
      { key: { id: 1 }, unique: true, name: "categories_id_unique" },
      { key: { active: 1, sortOrder: 1 }, name: "categories_active_sort" },
    ]),
    db.collection("users").createIndexes([
      { key: { id: 1 }, unique: true, name: "users_id_unique" },
      { key: { email: 1 }, unique: true, name: "users_email_unique" },
      { key: { status: 1, role: 1, createdAt: -1 }, name: "users_admin_list" },
    ]),
    db.collection("authSessions").createIndexes([
      { key: { tokenHash: 1 }, unique: true, name: "sessions_token_unique" },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "sessions_ttl" },
      { key: { userId: 1, lastSeenAt: -1 }, name: "sessions_user_activity" },
    ]),
    db.collection("authTokens").createIndexes([
      { key: { tokenHash: 1 }, unique: true, name: "tokens_hash_unique" },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "tokens_ttl" },
    ]),
    db.collection("carts").createIndex({ userId: 1 }, { unique: true, name: "carts_user_unique" }),
    db.collection("orders").createIndexes([
      { key: { orderNumber: 1 }, unique: true, name: "orders_number_unique" },
      { key: { "customer.email": 1, createdAt: -1 }, name: "orders_customer" },
    ]),
    db.collection("sampleRequests").createIndex({ requestNumber: 1 }, { unique: true, name: "samples_number_unique" }),
    db.collection("connectedAccounts").createIndex({ userId: 1, provider: 1 }, { unique: true, name: "connected_user_provider" }),
  ]);
}

export async function closeMongo(): Promise<void> {
  if (!client) return;
  await client.close();
  client = undefined;
}
