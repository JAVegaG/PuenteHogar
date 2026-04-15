-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "accounting";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "contracts";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "landlord_portfolio";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notifications";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "payments";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "property_listings";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tracking_process";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "users";

-- CreateTable
CREATE TABLE "users"."User" (
    "id" TEXT NOT NULL,
    "user_type" TEXT NOT NULL,
    "document_type_id" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "mail" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."DocumentType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."NaturalPersonDetail" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "preferred_name" TEXT,

    CONSTRAINT "NaturalPersonDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."LegalPersonDetail" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,

    CONSTRAINT "LegalPersonDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."Permission" (
    "id" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."UserRole" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."RolePermission" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users"."UsersRaw" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UsersRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings"."Property" (
    "id" TEXT NOT NULL,
    "property_type" TEXT NOT NULL,
    "length" DECIMAL(65,30),
    "width" DECIMAL(65,30),
    "number_of_bathrooms" INTEGER NOT NULL,
    "number_of_rooms" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings"."Address" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings"."Listing" (
    "id" TEXT NOT NULL,
    "portfolio_unit_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "listing_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings"."Photo" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings"."AdditionalFeature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "AdditionalFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings"."PropertyAdditionalFeature" (
    "property_id" TEXT NOT NULL,
    "additional_feature_id" TEXT NOT NULL,
    "value" TEXT,
    "order" INTEGER,

    CONSTRAINT "PropertyAdditionalFeature_pkey" PRIMARY KEY ("property_id","additional_feature_id")
);

-- CreateTable
CREATE TABLE "property_listings"."PropertyListingsRaw" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PropertyListingsRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landlord_portfolio"."LandlordPortfolio" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandlordPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landlord_portfolio"."PortfolioUnit" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "conditions" TEXT,
    "lease_base_amount" DECIMAL(65,30) NOT NULL,
    "lease_base_currency" TEXT NOT NULL DEFAULT 'COP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landlord_portfolio"."Lease" (
    "id" TEXT NOT NULL,
    "portfolio_unit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "enc_blob" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landlord_portfolio"."PortfolioRaw" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PortfolioRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_process"."LeaseStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "LeaseStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_process"."LeaseStatusHistory" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "lease_status_id" TEXT NOT NULL,
    "record_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_process"."LeaseCurrentStatus" (
    "lease_id" TEXT NOT NULL,
    "lease_status_history_id" TEXT NOT NULL,
    "lease_status_id" TEXT NOT NULL,

    CONSTRAINT "LeaseCurrentStatus_pkey" PRIMARY KEY ("lease_id")
);

-- CreateTable
CREATE TABLE "tracking_process"."ListingStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ListingStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_process"."ListingStatusHistory" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "listing_status_id" TEXT NOT NULL,
    "record_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_process"."ListingCurrentStatus" (
    "listing_id" TEXT NOT NULL,
    "listing_status_history_id" TEXT NOT NULL,
    "listing_status_id" TEXT NOT NULL,

    CONSTRAINT "ListingCurrentStatus_pkey" PRIMARY KEY ("listing_id")
);

-- CreateTable
CREATE TABLE "tracking_process"."TrackingRaw" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TrackingRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."ScheduledPayment" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."Payment" (
    "id" TEXT NOT NULL,
    "scheduled_payment_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "payment_desc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."PaymentStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PaymentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."PaymentLog" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "payment_status_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "platform" TEXT,
    "data" JSONB,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."PaymentsRaw" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaymentsRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."AggregatedPaymentReport" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "as_of_date" TIMESTAMP(3) NOT NULL,
    "window_months" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "number_of_units" INTEGER NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "avg_amount" DECIMAL(65,30) NOT NULL,
    "payment_count" INTEGER NOT NULL,
    "min_amount" DECIMAL(65,30) NOT NULL,
    "max_amount" DECIMAL(65,30) NOT NULL,
    "last_payment_at" TIMESTAMP(3),
    "first_payment_at" TIMESTAMP(3),
    "expected_amount" DECIMAL(65,30) NOT NULL,
    "overdue_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AggregatedPaymentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."IndividualPaymentReport" (
    "id" TEXT NOT NULL,
    "portfolio_unit_id" TEXT NOT NULL,
    "as_of_date" TIMESTAMP(3) NOT NULL,
    "window_months" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "total_amount" DECIMAL(65,30) NOT NULL,
    "min_amount" DECIMAL(65,30) NOT NULL,
    "max_amount" DECIMAL(65,30) NOT NULL,
    "payment_count" INTEGER NOT NULL,
    "last_payment_at" TIMESTAMP(3),
    "first_payment_at" TIMESTAMP(3),
    "expected_amount" DECIMAL(65,30) NOT NULL,
    "overdue_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualPaymentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."AccountingRaw" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccountingRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."NotificationType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "NotificationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."NotificationPreference" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_type_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."NotificationsRaw" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationsRaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."ContractStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ContractStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."Contract" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "contract_status_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."ContractParty" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "role_in_contract" TEXT NOT NULL,

    CONSTRAINT "ContractParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."FileType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "FileType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."FileStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "FileStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."File" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "file_type_id" TEXT NOT NULL,
    "file_status_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."SigningStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SigningStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."Signing" (
    "id" TEXT NOT NULL,
    "contract_party_id" TEXT NOT NULL,
    "signing_status_id" TEXT NOT NULL,
    "signing_timestamp" TIMESTAMP(3),
    "document_hash" TEXT,

    CONSTRAINT "Signing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."SigningLog" (
    "id" TEXT NOT NULL,
    "signing_id" TEXT NOT NULL,
    "signing_status_id" TEXT NOT NULL,
    "platform" TEXT,
    "data" JSONB,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SigningLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."ContractsRaw" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContractsRaw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mail_key" ON "users"."User"("mail");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_code_key" ON "users"."DocumentType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "NaturalPersonDetail_user_id_key" ON "users"."NaturalPersonDetail"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPersonDetail_user_id_key" ON "users"."LegalPersonDetail"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "users"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Address_property_id_key" ON "property_listings"."Address"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseStatus_name_key" ON "tracking_process"."LeaseStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseCurrentStatus_lease_status_history_id_key" ON "tracking_process"."LeaseCurrentStatus"("lease_status_history_id");

-- CreateIndex
CREATE UNIQUE INDEX "ListingStatus_name_key" ON "tracking_process"."ListingStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ListingCurrentStatus_listing_status_history_id_key" ON "tracking_process"."ListingCurrentStatus"("listing_status_history_id");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentStatus_name_key" ON "payments"."PaymentStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationType_name_key" ON "notifications"."NotificationType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ContractStatus_name_key" ON "contracts"."ContractStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FileType_name_key" ON "contracts"."FileType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FileStatus_name_key" ON "contracts"."FileStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SigningStatus_name_key" ON "contracts"."SigningStatus"("name");

-- AddForeignKey
ALTER TABLE "users"."User" ADD CONSTRAINT "User_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "users"."DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."NaturalPersonDetail" ADD CONSTRAINT "NaturalPersonDetail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."LegalPersonDetail" ADD CONSTRAINT "LegalPersonDetail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."UserRole" ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."UserRole" ADD CONSTRAINT "UserRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "users"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "users"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "users"."Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_listings"."Address" ADD CONSTRAINT "Address_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property_listings"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_listings"."Photo" ADD CONSTRAINT "Photo_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "property_listings"."Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_listings"."PropertyAdditionalFeature" ADD CONSTRAINT "PropertyAdditionalFeature_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "property_listings"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_listings"."PropertyAdditionalFeature" ADD CONSTRAINT "PropertyAdditionalFeature_additional_feature_id_fkey" FOREIGN KEY ("additional_feature_id") REFERENCES "property_listings"."AdditionalFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landlord_portfolio"."PortfolioUnit" ADD CONSTRAINT "PortfolioUnit_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "landlord_portfolio"."LandlordPortfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landlord_portfolio"."Lease" ADD CONSTRAINT "Lease_portfolio_unit_id_fkey" FOREIGN KEY ("portfolio_unit_id") REFERENCES "landlord_portfolio"."PortfolioUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_process"."LeaseStatusHistory" ADD CONSTRAINT "LeaseStatusHistory_lease_status_id_fkey" FOREIGN KEY ("lease_status_id") REFERENCES "tracking_process"."LeaseStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_process"."LeaseCurrentStatus" ADD CONSTRAINT "LeaseCurrentStatus_lease_status_history_id_fkey" FOREIGN KEY ("lease_status_history_id") REFERENCES "tracking_process"."LeaseStatusHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_process"."LeaseCurrentStatus" ADD CONSTRAINT "LeaseCurrentStatus_lease_status_id_fkey" FOREIGN KEY ("lease_status_id") REFERENCES "tracking_process"."LeaseStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_process"."ListingStatusHistory" ADD CONSTRAINT "ListingStatusHistory_listing_status_id_fkey" FOREIGN KEY ("listing_status_id") REFERENCES "tracking_process"."ListingStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_process"."ListingCurrentStatus" ADD CONSTRAINT "ListingCurrentStatus_listing_status_history_id_fkey" FOREIGN KEY ("listing_status_history_id") REFERENCES "tracking_process"."ListingStatusHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_process"."ListingCurrentStatus" ADD CONSTRAINT "ListingCurrentStatus_listing_status_id_fkey" FOREIGN KEY ("listing_status_id") REFERENCES "tracking_process"."ListingStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."Payment" ADD CONSTRAINT "Payment_scheduled_payment_id_fkey" FOREIGN KEY ("scheduled_payment_id") REFERENCES "payments"."ScheduledPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."PaymentLog" ADD CONSTRAINT "PaymentLog_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"."Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."PaymentLog" ADD CONSTRAINT "PaymentLog_payment_status_id_fkey" FOREIGN KEY ("payment_status_id") REFERENCES "payments"."PaymentStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"."NotificationPreference" ADD CONSTRAINT "NotificationPreference_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "notifications"."NotificationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."Contract" ADD CONSTRAINT "Contract_contract_status_id_fkey" FOREIGN KEY ("contract_status_id") REFERENCES "contracts"."ContractStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."ContractParty" ADD CONSTRAINT "ContractParty_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"."Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."File" ADD CONSTRAINT "File_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"."Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."File" ADD CONSTRAINT "File_file_type_id_fkey" FOREIGN KEY ("file_type_id") REFERENCES "contracts"."FileType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."File" ADD CONSTRAINT "File_file_status_id_fkey" FOREIGN KEY ("file_status_id") REFERENCES "contracts"."FileStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."Signing" ADD CONSTRAINT "Signing_contract_party_id_fkey" FOREIGN KEY ("contract_party_id") REFERENCES "contracts"."ContractParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."Signing" ADD CONSTRAINT "Signing_signing_status_id_fkey" FOREIGN KEY ("signing_status_id") REFERENCES "contracts"."SigningStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."SigningLog" ADD CONSTRAINT "SigningLog_signing_id_fkey" FOREIGN KEY ("signing_id") REFERENCES "contracts"."Signing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."SigningLog" ADD CONSTRAINT "SigningLog_signing_status_id_fkey" FOREIGN KEY ("signing_status_id") REFERENCES "contracts"."SigningStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
