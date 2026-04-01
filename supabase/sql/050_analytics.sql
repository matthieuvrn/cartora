-- Cartora — Analytics tables (menu views tracking)

-- CreateEnum
CREATE TYPE "device_type" AS ENUM ('MOBILE', 'DESKTOP', 'TABLET');

-- CreateEnum
CREATE TYPE "view_source" AS ENUM ('QR', 'DIRECT', 'LINK');

-- CreateTable
CREATE TABLE "menu_view_events" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "device_type" "device_type" NOT NULL,
    "source" "view_source" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_view_daily_stats" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "locale" "locale" NOT NULL,
    "device_type" "device_type" NOT NULL,
    "source" "view_source" NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_view_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_view_events_restaurant_id_created_at_idx" ON "menu_view_events"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "menu_view_events_created_at_idx" ON "menu_view_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "menu_view_daily_stats_restaurant_id_date_locale_device_type_source_key" ON "menu_view_daily_stats"("restaurant_id", "date", "locale", "device_type", "source");

-- CreateIndex
CREATE INDEX "menu_view_daily_stats_restaurant_id_date_idx" ON "menu_view_daily_stats"("restaurant_id", "date");

-- AddForeignKey
ALTER TABLE "menu_view_events" ADD CONSTRAINT "menu_view_events_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_view_daily_stats" ADD CONSTRAINT "menu_view_daily_stats_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
