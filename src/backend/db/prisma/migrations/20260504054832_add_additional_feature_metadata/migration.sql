-- AlterTable
ALTER TABLE "property_listings"."AdditionalFeature" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "element" TEXT NOT NULL DEFAULT 'text_field',
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "main" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text';
