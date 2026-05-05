import type { SignedUploadUrl, StorageService } from "@/application/ports/StorageService";
import { createClient } from "@supabase/supabase-js";

export class SupabaseStorageService implements StorageService {
  private readonly client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(private readonly bucket: string) {}

  async upload(path: string, buffer: Buffer, contentType: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  }

  getPublicUrl(path: string): string {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }

  async createSignedUploadUrl(path: string, _expiresInSec: number): Promise<SignedUploadUrl> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(path, { upsert: true });
    if (error || !data) throw new Error(`Signed URL creation failed: ${error?.message}`);
    return { uploadUrl: data.signedUrl, token: data.token, path: data.path };
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const { data: list, error: listError } = await this.client.storage
      .from(this.bucket)
      .list(prefix, { limit: 1000 });
    if (listError) throw new Error(`Storage list failed: ${listError.message}`);
    if (!list || list.length === 0) return;

    const paths = list.map((entry) => `${prefix}${entry.name}`);
    const { error: removeError } = await this.client.storage.from(this.bucket).remove(paths);
    if (removeError) throw new Error(`Storage prefix delete failed: ${removeError.message}`);
  }
}
