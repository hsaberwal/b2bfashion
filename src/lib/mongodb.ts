import mongoose from "mongoose";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please set MONGODB_URI in .env (e.g. mongodb://localhost:27017/b2bfashion)"
    );
  }
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongoose ?? { conn: null, promise: null };
if (globalThis.mongoose === undefined) globalThis.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri());
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
