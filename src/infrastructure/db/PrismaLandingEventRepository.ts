import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { Locale, DeviceType as PrismaDeviceType } from "@/generated/prisma/client";
import type {
  LandingEventRepository,
  RecordLandingEventInput,
} from "@/application/ports/LandingEventRepository";

export class PrismaLandingEventRepository implements LandingEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(input: RecordLandingEventInput): Promise<void> {
    await this.prisma.landingEvent.create({
      data: {
        eventName: input.eventName,
        locale: input.locale.toUpperCase() as Locale,
        deviceType: input.deviceType as PrismaDeviceType,
        source: input.source,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        userAgent: input.userAgent,
        referer: input.referer,
      },
    });
  }
}
