import type { QrCodeGenerator } from "@/application/ports/QrCodeGenerator";
import QRCode from "qrcode";

export class NodeQrCodeGenerator implements QrCodeGenerator {
  async generate(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, {
      type: "png",
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  }
}
