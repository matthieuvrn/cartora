export interface QrCodeGenerator {
  generate(url: string): Promise<Buffer>;
}
