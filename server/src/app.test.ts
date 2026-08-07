import assert from "node:assert/strict";
import test from "node:test";
import type { AppServices } from "./repositories.js";
import { buildApp } from "./app.js";

const product = {
  id: "p1",
  sku: "TEST-1",
  slug: "test-product",
  categoryId: "fringe",
  status: "active" as const,
  names: { en: "Test fringe", de: "Testfranse", uk: "Тестова бахрома", ru: "Тестовая бахрома" },
  primaryImageKey: "products/test.jpg",
  media: [],
  variants: [],
  variantCount: 2,
  tags: [],
  isNew: true,
  featured: true,
  attributes: {},
  priceUsd: 12,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const insertedRequests: unknown[] = [];
const insertedOrders: unknown[] = [];
const services: AppServices = {
  databaseHealth: async () => undefined,
  catalog: {
    listProducts: async () => ({ items: [product], total: 1 }),
    findProductBySlug: async () => product,
    listCategories: async () => [{
      id: "fringe",
      slug: "fringes",
      active: true,
      sortOrder: 1,
      names: product.names,
    }],
  },
  sampleRequests: {
    create: async (document) => { insertedRequests.push(document); },
  },
  orders: {
    create: async (document) => { insertedOrders.push(document); },
  },
};

test("catalog and sample request API", async () => {
  const app = await buildApp(services);

  const health = await app.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);

  const catalog = await app.inject({ method: "GET", url: "/api/v1/catalog/products?locale=de" });
  assert.equal(catalog.statusCode, 200);
  assert.equal(catalog.json().data[0].name, "Testfranse");
  assert.equal(catalog.json().data[0].priceUsd, undefined);

  const tradeCatalog = await app.inject({ method: "GET", url: "/api/v1/catalog/products?locale=en", headers: { "x-internal-api-key": "test-internal-api-key-000000000000" } });
  assert.equal(tradeCatalog.statusCode, 200);
  assert.equal(tradeCatalog.json().data[0].priceUsd, 12);

  const sampleRequest = await app.inject({
    method: "POST",
    url: "/api/v1/sample-requests",
    payload: {
      locale: "en",
      customer: { name: "Studio Test", email: "studio@example.com" },
      items: [{ productId: "p1", sku: "TEST-1", quantity: 1 }],
    },
  });
  assert.equal(sampleRequest.statusCode, 201);
  assert.equal(insertedRequests.length, 1);

  const order = await app.inject({
    method: "POST",
    url: "/api/v1/orders",
    payload: {
      locale: "en",
      customer: { name: "Studio Test", email: "studio@example.com", phone: "+49 12345", country: "DE", city: "Berlin", address: "Test 1", postcode: "10115" },
      items: [{ productId: "p1", sku: "TEST-1", quantity: 2, unitPriceUsd: 12 }],
    },
  });
  assert.equal(order.statusCode, 201);
  assert.match(order.json().data.id, /^LTX-\d{8}-[A-Z0-9]{6}$/);
  assert.equal(insertedOrders.length, 1);

  await app.close();
});
