import * as Minio from "minio";
import { Storage } from "@google-cloud/storage";

export const ALLOWED_FILE_TYPES = {
  images: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ],
  archives: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"],
};

export const ALL_ALLOWED_TYPES = [...ALLOWED_FILE_TYPES.images, ...ALLOWED_FILE_TYPES.documents, ...ALLOWED_FILE_TYPES.archives];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DANGEROUS_EXTENSIONS = [".exe", ".bat", ".cmd", ".scr", ".pif", ".jar", ".com", ".vbs", ".js", ".jse", ".wsf", ".wsh"];

export interface UploadOptions {
  fileName: string;
  contentType: string;
  folder?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  path: string;
}

const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000", 10),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
};
const minioBucket = process.env.MINIO_BUCKET_NAME || "crm-files";
const minioPublicUrl = process.env.MINIO_PUBLIC_URL || `http${minioConfig.useSSL ? "s" : ""}://${minioConfig.endPoint}:${minioConfig.port}`;

const gcsBucketName = process.env.GCS_BUCKET_NAME || "";
const gcsPublicUrl = process.env.GCS_PUBLIC_URL || `https://storage.googleapis.com/${gcsBucketName}`;

let minioClient: Minio.Client | null = null;
let minioBucketReady = false;
let gcsBucket: ReturnType<Storage["bucket"]> | null = null;

function provider() {
  return process.env.STORAGE_PROVIDER || "minio";
}

async function getMinio() {
  if (!minioClient) minioClient = new Minio.Client(minioConfig);
  if (!minioBucketReady) {
    const exists = await minioClient.bucketExists(minioBucket);
    if (!exists) await minioClient.makeBucket(minioBucket);
    minioBucketReady = true;
  }
  return minioClient;
}

function getGcs() {
  if (!gcsBucket) {
    gcsBucket = new Storage({ projectId: process.env.GCS_PROJECT_ID }).bucket(gcsBucketName);
  }
  return gcsBucket;
}

export function validateFile(file: { mimetype?: string; size: number; name: string }, allowedTypes: string[] = ALL_ALLOWED_TYPES, maxSize = MAX_FILE_SIZE) {
  const errors: string[] = [];
  if (!file.mimetype || !allowedTypes.includes(file.mimetype)) errors.push(`File type not allowed: ${file.mimetype}`);
  if (file.size > maxSize) errors.push(`File size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${maxSize / 1024 / 1024}MB`);
  if (!file.name) errors.push("Filename is required");
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
  if (DANGEROUS_EXTENSIONS.includes(ext)) errors.push(`Dangerous file extension not allowed: ${ext}`);
  return { isValid: errors.length === 0, errors };
}

export function buildFilePath(folder: string, fileName: string) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.+/g, ".").substring(0, 100);
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${folder.replace(/^\/+|\/+$/g, "")}/${date.getFullYear()}/${month}/${Date.now()}_${sanitized}`;
}

export async function uploadFile(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
  const path = buildFilePath(options.folder || "files", options.fileName);

  if (provider() === "gcs") {
    const file = getGcs().file(path);
    await file.save(buffer, {
      contentType: options.contentType,
      metadata: { cacheControl: "public, max-age=31536000", metadata: options.metadata || {} },
      resumable: false,
    });
    await file.makePublic().catch(() => undefined);
    return { url: `${gcsPublicUrl}/${path}`, path };
  }

  const client = await getMinio();
  await client.putObject(minioBucket, path, buffer, buffer.length, {
    "Content-Type": options.contentType,
    "Cache-Control": "max-age=31536000",
    ...(options.metadata || {}),
  });
  return { url: `${minioPublicUrl}/${minioBucket}/${path}`, path };
}

export async function deleteFile(path: string): Promise<void> {
  if (provider() === "gcs") {
    await getGcs().file(path).delete();
    return;
  }
  const client = await getMinio();
  await client.removeObject(minioBucket, path);
}

export async function getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  if (provider() === "gcs") {
    const [url] = await getGcs().file(path).getSignedUrl({ action: "read", expires: Date.now() + expiresInSeconds * 1000 });
    return url;
  }
  const client = await getMinio();
  return client.presignedGetObject(minioBucket, path, expiresInSeconds);
}
