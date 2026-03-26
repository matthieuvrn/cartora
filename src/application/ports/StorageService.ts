export interface StorageService {
  upload(path: string, buffer: Buffer, contentType: string): Promise<void>;
  getPublicUrl(path: string): string;
}
