import { requireAdminAccess } from "@/lib/admin-product-import";

export async function GET(request: Request) {
  const denied = await requireAdminAccess();
  if (denied) return denied;
  try {
    const value = new URL(request.url).searchParams.get("url") || "";
    const url = new URL(value);
    if (!/^(www\.)?chinatrimming\.cn$/i.test(url.hostname) || !/^\/upload\//i.test(url.pathname)) {
      return Response.json({ error: "invalid_image_url" }, { status: 400 });
    }
    const response = await fetch(url.href, { signal: AbortSignal.timeout(45_000) });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) return new Response(null, { status: 404 });
    return new Response(response.body, { headers: { "content-type": contentType, "cache-control": "private, max-age=3600" } });
  } catch {
    return new Response(null, { status: 400 });
  }
}
