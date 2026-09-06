export {};

type ProductAssetBucket = {
  put: (key: string, value: ArrayBuffer, options?: {
    httpMetadata?: { contentType?: string; cacheControl?: string };
    customMetadata?: Record<string, string>;
  }) => Promise<unknown>;
};

declare global {
  interface CloudflareEnv {
    PRODUCT_ASSETS?: ProductAssetBucket;
    CHINA_ACCOUNT?: string;
    CHINA_PASSWORD?: string;
  }
}
