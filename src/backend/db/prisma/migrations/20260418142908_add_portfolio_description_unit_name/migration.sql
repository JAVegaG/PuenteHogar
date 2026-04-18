/*
  Warnings:

  - A unique constraint covering the columns `[portfolio_unit_id,end_date]` on the table `Lease` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[portfolio_unit_id,is_active]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,role_id]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "landlord_portfolio"."LandlordPortfolio" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "landlord_portfolio"."PortfolioUnit" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Lease_portfolio_unit_id_end_date_key" ON "landlord_portfolio"."Lease"("portfolio_unit_id", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_portfolio_unit_id_is_active_key" ON "property_listings"."Listing"("portfolio_unit_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_user_id_role_id_key" ON "users"."UserRole"("user_id", "role_id");
