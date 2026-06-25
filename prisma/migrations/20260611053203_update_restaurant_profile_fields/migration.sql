/*
  Warnings:

  - You are about to drop the column `coverUrl` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDeliveryTime` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `primaryPhone` on the `Restaurant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Restaurant" DROP COLUMN "coverUrl",
DROP COLUMN "estimatedDeliveryTime",
DROP COLUMN "logoUrl",
DROP COLUMN "primaryPhone",
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "deliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deliveryTime" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "logoImage" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "reviewsCount" INTEGER DEFAULT 0;
