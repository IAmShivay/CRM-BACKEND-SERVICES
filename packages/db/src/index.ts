import mongoose from "mongoose";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/crm-platform";

  mongoose.set("strictQuery", true);

  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      isConnected = true;

      mongoose.connection.on("disconnected", () => {
        isConnected = false;
      });

      mongoose.connection.on("error", () => {
        isConnected = false;
      });

      return mongoose;
    } catch (err) {
      retries++;
      if (retries >= MAX_RETRIES) {
        throw new Error(
          `Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${err}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw new Error("Failed to connect to MongoDB");
}

export { mongoose };
export default connectDB;

const isObjectId = (value: unknown) =>
  value instanceof mongoose.Types.ObjectId || (typeof value === "object" && value !== null && (value as any)._bsontype === "ObjectId");

function normalizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (isObjectId(value)) return String(value);
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === "object") return leanId(value as Record<string, unknown>);
  return value;
}

export function leanId<T extends Record<string, unknown>>(doc: T): T & { id?: string } {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === "__v") continue;
    if (key === "_id") {
      out.id = String(value);
      continue;
    }
    out[key] = normalizeValue(value);
  }
  return out as T & { id?: string };
}

export function leanIds<T extends Record<string, unknown>>(docs: T[]): Array<T & { id?: string }> {
  return docs.map((doc) => leanId(doc));
}
