import { adminRelay } from "@/lib/admin-api";
import { getSeedProducts } from "@/data/catalog";
import { createBackendProduct, requireAdminAccess, uploadManualImages, type ProductDraft } from "@/lib/admin-product-import";
import { relay } from "@/lib/account-api";

export async function GET(request: Request) {
  const response = await adminRelay(`/api/v1/admin/products${new URL(request.url).search}`);
  if (!response.ok) return response;

  const payload = await response.json() as {
    data: {
      items: Array<{
        id: string;
        sku: string;
        priceUsd?: number | null;
        retailPriceUsd?: number | null;
        partnerPriceUsd?: number | null;
      }>;
      page: number;
      total: number;
    };
  };
  const localPrices = new Map(getSeedProducts("ru").map((product) => [product.id, product.partnerPriceUsd ?? product.priceUsd]));
  payload.data.items = payload.data.items.map((product) => {
    const partnerPriceUsd = product.partnerPriceUsd ?? product.priceUsd ?? localPrices.get(product.id) ?? null;
    return {
      ...product,
      partnerPriceUsd,
      retailPriceUsd: partnerPriceUsd === null ? null : Number((partnerPriceUsd * 2).toFixed(2)),
    };
  });
  return Response.json(payload, { headers: { "cache-control": "private, no-store" } });
}

const formText = (form: FormData, name: string) => String(form.get(name) || "").trim();

export async function POST(request: Request) {
  const denied = await requireAdminAccess();
  if (denied) return denied;
  try {
    const form = await request.formData();
    const sku = formText(form, "sku").toUpperCase();
    const categoryId = formText(form, "categoryId");
    const ru = formText(form, "nameRu");
    if (!sku || !categoryId || !ru) return Response.json({ error: "Заполните артикул, категорию и название." }, { status: 400 });
    const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
    if (!files.length) return Response.json({ error: "Добавьте хотя бы одно изображение." }, { status: 400 });
    const id = crypto.randomUUID();
    const uploaded = await uploadManualImages(id, files);
    const names: ProductDraft["names"] = {
      ru,
      uk: formText(form, "nameUk") || ru,
      de: formText(form, "nameDe") || ru,
      en: formText(form, "nameEn") || ru,
    };
    const description = formText(form, "description");
    const priceText = formText(form, "partnerPriceUsd");
    const product: ProductDraft = {
      id,
      sku,
      categoryId,
      status: formText(form, "status") === "draft" ? "draft" : "active",
      names,
      ...(description ? { descriptions: { ru: description, uk: description, de: description, en: description } } : {}),
      primaryImageKey: uploaded[0]!.key,
      media: uploaded.map((image, sortOrder) => ({ key: image.key, alt: names, sortOrder })),
      variants: uploaded.map((image) => ({ id: image.id, optionValues: {}, mediaKeys: [image.key], stock: { tracked: false, available: 0 } })),
      ...(priceText ? { partnerPriceUsd: Number(priceText) } : {}),
      isNew: form.get("isNew") === "on",
      attributes: { source: "admin" },
    };
    const response = await createBackendProduct(product);
    return relay(response);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось создать товар." }, { status: 400 });
  }
}
