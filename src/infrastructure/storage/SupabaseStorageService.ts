import type { StorageService } from "@/application/ports/StorageService";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "qr-codes";

export class SupabaseStorageService implements StorageService {
  private readonly client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async upload(path: string, buffer: Buffer, contentType: string): Promise<void> {
    const { error } = await this.client.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  }

  getPublicUrl(path: string): string {
    const { data } = this.client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage.from(BUCKET).remove([path]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }
}
