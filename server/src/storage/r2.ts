import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../config.js";

function requireR2Config() {
  if (!config.R2_ACCOUNT_ID || !config.R2_ACCESS_KEY_ID || !config.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials are required for asset uploads");
  }
  return {
    accountId: config.R2_ACCOUNT_ID,
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
  };
}

export function createR2Client(): S3Client {
  const credentials = requireR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

let r2Client: S3Client | undefined;

export async function uploadAsset(key: string, body: Uint8Array, contentType: string): Promise<void> {
  r2Client ||= createR2Client();
  await r2Client.send(new PutObjectCommand({
    Bucket: config.R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
}

export async function assetHasSize(key: string, size: number): Promise<boolean> {
  r2Client ||= createR2Client();
  try {
    const object = await r2Client.send(new HeadObjectCommand({
      Bucket: config.R2_BUCKET,
      Key: key,
    }));
    return object.ContentLength === size;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw error;
  }
}

export function publicAssetUrl(key: string): string {
  return new URL(key.replace(/^\//, ""), `${config.ASSETS_PUBLIC_URL.replace(/\/$/, "")}/`).href;
}
