import { env } from "@/lib/env";

import { createSupabaseServiceClient } from "./client";

export type StorageUploadInput = {
  path: string;
  body: Blob | ArrayBuffer | Buffer | File;
  contentType?: string;
  bucket?: string;
};

export async function uploadToStorage({
  path,
  body,
  contentType,
  bucket = env.SUPABASE_STORAGE_BUCKET,
}: StorageUploadInput) {
  const supabase = createSupabaseServiceClient();

  return supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: false,
  });
}
