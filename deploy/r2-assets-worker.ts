interface Env {
  ASSETS: R2Bucket;
  UPLOAD_TOKEN?: string;
}

const publicRootFiles = new Set(["favicon-32.png", "icon-192.png", "icon-512.png"]);

function isPublicAsset(key: string): boolean {
  return key.startsWith("products/") || key.startsWith("brand/") || publicRootFiles.has(key);
}

function assetKey(pathname: string): string {
  return pathname.replace(/^\/+/, "").split("/").map((part) => decodeURIComponent(part)).join("/");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/__upload-ready") {
      const token = request.headers.get("x-nora-upload-token");
      return env.UPLOAD_TOKEN && token === env.UPLOAD_TOKEN
        ? new Response(null, { status: 204 })
        : new Response("Unauthorized", { status: 401 });
    }

    if (request.method === "PUT" && url.pathname.startsWith("/__upload/")) {
      const token = request.headers.get("x-nora-upload-token");
      if (!env.UPLOAD_TOKEN || token !== env.UPLOAD_TOKEN) return new Response("Unauthorized", { status: 401 });
      const key = assetKey(url.pathname.slice("/__upload/".length));
      if (!isPublicAsset(key)) return new Response("Invalid asset key", { status: 400 });
      await env.ASSETS.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get("content-type") || "application/octet-stream",
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
      return new Response(null, { status: 201 });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const key = assetKey(url.pathname);
    if (!isPublicAsset(key)) return new Response("Not found", { status: 404 });
    const object = await env.ASSETS.get(key, { onlyIf: request.headers });
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-length", String(object.size));
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("access-control-allow-origin", "*");
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  },
} satisfies ExportedHandler<Env>;
