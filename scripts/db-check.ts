import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    const [row] = await prisma.$queryRaw<[{ ok: number }]>`SELECT 1 AS ok`;
    console.log("DB connection OK:", row);
  } catch (error) {
    console.error("DB connection FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
