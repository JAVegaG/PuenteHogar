-- CreateTable
CREATE TABLE "property_listings"."Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings"."City" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "department_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "property_listings"."Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "City_code_key" ON "property_listings"."City"("code");

-- AddForeignKey
ALTER TABLE "property_listings"."City" ADD CONSTRAINT "City_department_code_fkey" FOREIGN KEY ("department_code") REFERENCES "property_listings"."Department"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
