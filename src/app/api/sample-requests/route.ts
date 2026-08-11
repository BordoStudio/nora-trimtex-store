import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

type RequestBody = {
  locale?: string;
  customer?: { name?: string; email?: string; company?: string };
  notes?: string;
  items?: Array<{ productId?: string; sku?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  const body = await request.json() as RequestBody;
  if (!body.customer?.name || !body.customer.email?.includes("@") || !body.items?.length) {
    return Response.json({ error: "Invalid sample request" }, { status: 400 });
  }

  const record = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    locale: body.locale || "en",
    customer: body.customer,
    notes: body.notes || null,
    items: body.items,
  };
  const file = join(process.cwd(), "data", "sample-requests.ndjson");
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
  return Response.json({ data: { id: record.id, status: "received" } }, { status: 201 });
}
