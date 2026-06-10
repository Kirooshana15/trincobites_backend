-- CreateEnum
CREATE TYPE "CuisineType" AS ENUM ('SRILANKAN', 'SEAFOOD', 'KOTTU', 'BIRYANI', 'BURGERS', 'PIZZA', 'CHINESE', 'DESSERTS', 'SOUTH_INDIAN', 'JUICES');

-- CreateEnum
CREATE TYPE "RestaurantTag" AS ENUM ('HALAL', 'VEGETARIAN', 'VEGAN', 'SPICY', 'FAST_FOOD', 'FAMILY_FRIENDLY', 'LOCAL_FAVORITE', 'BUDGET_FRIENDLY', 'PREMIUM', 'DESSERT');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "cuisineTypes" "CuisineType"[],
    "tags" "RestaurantTag"[],
    "streetAddress" TEXT,
    "city" TEXT,
    "district" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "primaryPhone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "supportNumber" TEXT,
    "halalFriendly" BOOLEAN NOT NULL DEFAULT false,
    "vegetarianFriendly" BOOLEAN NOT NULL DEFAULT false,
    "dineIn" BOOLEAN NOT NULL DEFAULT false,
    "takeaway" BOOLEAN NOT NULL DEFAULT false,
    "delivery" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRadius" DOUBLE PRECISION,
    "estimatedDeliveryTime" TEXT,
    "deliveryFee" DOUBLE PRECISION,
    "minOrder" DOUBLE PRECISION,
    "freeDeliveryThreshold" DOUBLE PRECISION,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "weeklyHours" JSONB,
    "holidayMode" BOOLEAN NOT NULL DEFAULT false,
    "temporaryClosure" BOOLEAN NOT NULL DEFAULT false,
    "facebook" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "youtube" TEXT,
    "website" TEXT,
    "acceptOrders" BOOLEAN NOT NULL DEFAULT true,
    "showPublicly" BOOLEAN NOT NULL DEFAULT true,
    "vacationMode" BOOLEAN NOT NULL DEFAULT false,
    "autoAcceptOrders" BOOLEAN NOT NULL DEFAULT false,
    "cashOnDelivery" BOOLEAN NOT NULL DEFAULT true,
    "featuredRestaurant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_userId_key" ON "Restaurant"("userId");

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
