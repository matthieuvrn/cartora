-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "plan_status" AS ENUM ('FREE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "menu_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "category_type" AS ENUM ('STARTERS', 'MAINS', 'DESSERTS', 'DRINKS');

-- CreateEnum
CREATE TYPE "item_badge" AS ENUM ('NONE', 'NEW', 'POPULAR');

-- CreateEnum
CREATE TYPE "locale" AS ENUM ('FR', 'EN');

-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('RESTAURANT', 'MENU', 'ITEM');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan_status" "plan_status" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "status" "menu_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "type" "category_type" NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "badge" "item_badge" NOT NULL DEFAULT 'NONE',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" UUID NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "value" TEXT NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_assets" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_public_snapshots" (
    "id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_public_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_owner_user_id_key" ON "restaurants"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "menus_restaurant_id_key" ON "menus"("restaurant_id");

-- CreateIndex
CREATE INDEX "categories_restaurant_id_idx" ON "categories"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_menu_id_type_key" ON "categories"("menu_id", "type");

-- CreateIndex
CREATE INDEX "items_category_id_idx" ON "items"("category_id");

-- CreateIndex
CREATE INDEX "items_restaurant_id_idx" ON "items"("restaurant_id");

-- CreateIndex
CREATE INDEX "translations_restaurant_id_idx" ON "translations"("restaurant_id");

-- CreateIndex
CREATE INDEX "translations_entity_type_entity_id_idx" ON "translations"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "translations_entity_type_entity_id_field_locale_key" ON "translations"("entity_type", "entity_id", "field", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "billing_restaurant_id_key" ON "billing"("restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_stripe_customer_id_key" ON "billing"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_stripe_subscription_id_key" ON "billing"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_assets_restaurant_id_key" ON "qr_assets"("restaurant_id");

-- CreateIndex
CREATE INDEX "menu_public_snapshots_menu_id_idx" ON "menu_public_snapshots"("menu_id");

-- CreateIndex
CREATE INDEX "menu_public_snapshots_restaurant_id_idx" ON "menu_public_snapshots"("restaurant_id");

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing" ADD CONSTRAINT "billing_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_assets" ADD CONSTRAINT "qr_assets_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_public_snapshots" ADD CONSTRAINT "menu_public_snapshots_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_public_snapshots" ADD CONSTRAINT "menu_public_snapshots_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
