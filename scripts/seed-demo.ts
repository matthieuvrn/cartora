import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient, type ItemBadge } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

import { PrismaRestaurantRepository } from "../src/infrastructure/restaurant/PrismaRestaurantRepository";
import { PrismaMenuRepository } from "../src/infrastructure/menu/PrismaMenuRepository";
import { PrismaSnapshotRepository } from "../src/infrastructure/snapshot/PrismaSnapshotRepository";
import { PublishMenu } from "../src/application/use-cases/PublishMenu";

const DEMO_EMAIL = "demo@cartora.app";
const DEMO_SLUG = "demo-cartora";
const DEMO_DISPLAY_NAME = "Le Bistrot Démo";

type DemoItem = {
  priceCents: number;
  badge: ItemBadge;
  nameFr: string;
  descriptionFr: string;
  nameEn: string;
  descriptionEn: string;
};

type DemoCategory = {
  name: string;
  items: DemoItem[];
};

const DEMO_MENU: DemoCategory[] = [
  {
    name: "Entrées",
    items: [
      {
        priceCents: 950,
        badge: "POPULAR",
        nameFr: "Velouté de potimarron",
        descriptionFr: "Crème de potimarron rôti, huile de noisette et croûtons maison.",
        nameEn: "Roasted squash velouté",
        descriptionEn: "Roasted squash cream with hazelnut oil and homemade croutons.",
      },
      {
        priceCents: 1200,
        badge: "NONE",
        nameFr: "Tartare de betterave",
        descriptionFr:
          "Betteraves rouges, chèvre frais, noisettes torréfiées et pousses de moutarde.",
        nameEn: "Beetroot tartare",
        descriptionEn: "Red beetroot, fresh goat cheese, toasted hazelnuts and mustard sprouts.",
      },
      {
        priceCents: 1400,
        badge: "NEW",
        nameFr: "Burrata fumée",
        descriptionFr: "Burrata fumée au bois de hêtre, tomates anciennes et basilic.",
        nameEn: "Smoked burrata",
        descriptionEn: "Beechwood-smoked burrata, heirloom tomatoes and basil.",
      },
    ],
  },
  {
    name: "Plats",
    items: [
      {
        priceCents: 2400,
        badge: "POPULAR",
        nameFr: "Magret de canard",
        descriptionFr: "Magret rôti, sauce au miel et romarin, pommes grenailles.",
        nameEn: "Duck breast",
        descriptionEn: "Roasted duck breast, honey-rosemary jus and baby potatoes.",
      },
      {
        priceCents: 2100,
        badge: "NONE",
        nameFr: "Risotto aux cèpes",
        descriptionFr: "Riz carnaroli crémeux, cèpes sauvages et copeaux de parmesan.",
        nameEn: "Porcini risotto",
        descriptionEn: "Creamy carnaroli rice, wild porcini and parmesan shavings.",
      },
      {
        priceCents: 2600,
        badge: "NEW",
        nameFr: "Bar en croûte de sel",
        descriptionFr: "Bar de ligne cuit en croûte de sel, légumes de saison et beurre citronné.",
        nameEn: "Salt-crusted sea bass",
        descriptionEn: "Line-caught sea bass in salt crust, seasonal vegetables and lemon butter.",
      },
    ],
  },
  {
    name: "Desserts",
    items: [
      {
        priceCents: 900,
        badge: "POPULAR",
        nameFr: "Tarte au citron revisitée",
        descriptionFr: "Crème de citron de Menton, meringue italienne et sablé breton.",
        nameEn: "Lemon tart, revisited",
        descriptionEn: "Menton lemon curd, Italian meringue and Breton shortbread.",
      },
      {
        priceCents: 950,
        badge: "NONE",
        nameFr: "Moelleux chocolat noir",
        descriptionFr: "Fondant au chocolat noir 70%, cœur coulant et glace vanille bourbon.",
        nameEn: "Dark chocolate fondant",
        descriptionEn:
          "70% dark chocolate fondant with molten heart and bourbon vanilla ice cream.",
      },
      {
        priceCents: 850,
        badge: "NEW",
        nameFr: "Pavlova aux fruits rouges",
        descriptionFr: "Meringue croquante, chantilly vanillée et fruits rouges de saison.",
        nameEn: "Red berry pavlova",
        descriptionEn: "Crisp meringue, vanilla whipped cream and seasonal red berries.",
      },
    ],
  },
  {
    name: "Boissons",
    items: [
      {
        priceCents: 450,
        badge: "NONE",
        nameFr: "Limonade artisanale",
        descriptionFr: "Limonade maison au citron de Sicile et menthe fraîche.",
        nameEn: "Artisan lemonade",
        descriptionEn: "House lemonade with Sicilian lemon and fresh mint.",
      },
      {
        priceCents: 650,
        badge: "POPULAR",
        nameFr: "Verre de Côtes du Rhône",
        descriptionFr: "Rouge fruité, notes de fruits noirs et épices douces.",
        nameEn: "Glass of Côtes du Rhône",
        descriptionEn: "Fruity red with black fruit and mild spice notes.",
      },
      {
        priceCents: 400,
        badge: "NONE",
        nameFr: "Café expresso",
        descriptionFr: "Pure Arabica torréfié en France, servi court.",
        nameEn: "Espresso",
        descriptionEn: "Pure Arabica roasted in France, served short.",
      },
    ],
  },
];

async function ensureDemoAuthUser(): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up existing user by email via paginated listUsers
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === DEMO_EMAIL);
    if (found) return found.id;
    if (data.users.length < perPage) break;
    page += 1;
  }

  // Create a new demo user (random password — never used for login)
  const randomPassword = `demo-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: randomPassword,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Failed to create demo auth user");
  return data.user.id;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const demoOwnerUserId = await ensureDemoAuthUser();

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Upsert restaurant (slug is the stable key)
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: DEMO_SLUG },
      update: {
        displayName: DEMO_DISPLAY_NAME,
        planStatus: "ACTIVE",
      },
      create: {
        ownerUserId: demoOwnerUserId,
        displayName: DEMO_DISPLAY_NAME,
        slug: DEMO_SLUG,
        planStatus: "ACTIVE",
      },
      select: { id: true },
    });

    // 2. Upsert menu (one per restaurant)
    const menu = await prisma.menu.upsert({
      where: { restaurantId: restaurant.id },
      update: {},
      create: { restaurantId: restaurant.id },
      select: { id: true },
    });

    // 3. Upsert categories by name (matched insensitively via lower(btrim))
    const categoryIds: string[] = [];
    for (let order = 0; order < DEMO_MENU.length; order++) {
      const { name } = DEMO_MENU[order];
      const existing = await prisma.category.findFirst({
        where: { menuId: menu.id, name },
        select: { id: true },
      });

      const category = existing
        ? await prisma.category.update({
            where: { id: existing.id },
            data: { name, order },
            select: { id: true },
          })
        : await prisma.category.create({
            data: {
              menuId: menu.id,
              restaurantId: restaurant.id,
              name,
              order,
            },
            select: { id: true },
          });

      categoryIds.push(category.id);
    }

    // 4. Replace items + translations (deterministic re-seed)
    await prisma.$transaction(async (tx) => {
      // Delete existing demo items (translations cascade via entityId lookup — delete manually)
      const existingItems = await tx.item.findMany({
        where: { restaurantId: restaurant.id },
        select: { id: true },
      });
      const existingItemIds = existingItems.map((i) => i.id);
      if (existingItemIds.length > 0) {
        await tx.translation.deleteMany({
          where: {
            entityType: "ITEM",
            entityId: { in: existingItemIds },
            restaurantId: restaurant.id,
          },
        });
        await tx.item.deleteMany({
          where: { id: { in: existingItemIds } },
        });
      }

      // Create fresh items + translations
      for (let catIdx = 0; catIdx < DEMO_MENU.length; catIdx++) {
        const { items } = DEMO_MENU[catIdx];
        const categoryId = categoryIds[catIdx];
        for (let order = 0; order < items.length; order++) {
          const item = items[order];
          const created = await tx.item.create({
            data: {
              categoryId,
              restaurantId: restaurant.id,
              priceCents: item.priceCents,
              badge: item.badge,
              isAvailable: true,
              order,
            },
            select: { id: true },
          });

          await tx.translation.createMany({
            data: [
              {
                entityType: "ITEM",
                entityId: created.id,
                field: "name",
                locale: "FR",
                value: item.nameFr,
                restaurantId: restaurant.id,
              },
              {
                entityType: "ITEM",
                entityId: created.id,
                field: "description",
                locale: "FR",
                value: item.descriptionFr,
                restaurantId: restaurant.id,
              },
              {
                entityType: "ITEM",
                entityId: created.id,
                field: "name",
                locale: "EN",
                value: item.nameEn,
                restaurantId: restaurant.id,
              },
              {
                entityType: "ITEM",
                entityId: created.id,
                field: "description",
                locale: "EN",
                value: item.descriptionEn,
                restaurantId: restaurant.id,
              },
            ],
          });
        }
      }
    });

    // 5. Publish the menu via the existing use case (builds and upserts the snapshot)
    const restaurantRepo = new PrismaRestaurantRepository(prisma);
    const menuRepo = new PrismaMenuRepository(prisma);
    const snapshotRepo = new PrismaSnapshotRepository(prisma);
    const clock = { nowISO: () => new Date().toISOString() };

    const publishMenu = new PublishMenu(menuRepo, restaurantRepo, snapshotRepo, clock);
    const { slug } = await publishMenu.execute({ restaurantId: restaurant.id });

    console.log(`Demo seeded: /m/${slug}`);
  } catch (error) {
    console.error("Demo seed FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
