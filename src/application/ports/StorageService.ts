export type SignedUploadUrl = {
  uploadUrl: string;
  token: string;
  path: string;
};

export interface StorageService {
  upload(path: string, buffer: Buffer, contentType: string): Promise<void>;
  getPublicUrl(path: string): string;
  delete(path: string): Promise<void>;

  /**
   * Returns a short-lived URL the browser can PUT to in order to upload directly to storage,
   * bypassing the server. Path layout is caller-defined (must match the bucket's RLS).
   */
  createSignedUploadUrl(path: string, expiresInSec: number): Promise<SignedUploadUrl>;

  /**
   * Removes every object whose key starts with the given prefix. Used at restaurant-deletion
   * time to wipe all per-restaurant assets in one call.
   */
  deleteByPrefix(prefix: string): Promise<void>;
}
