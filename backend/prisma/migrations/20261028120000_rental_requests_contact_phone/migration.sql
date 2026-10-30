CREATE TYPE "RentalRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

ALTER TYPE "NotificationType" ADD VALUE 'RENTAL_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'RENTAL_REQUEST_UPDATED';

ALTER TABLE "Property" ADD COLUMN "contactPhone" TEXT;
UPDATE "Property" AS property
SET "contactPhone" = "User"."phone"
FROM "User"
WHERE property."ownerId" = "User"."id";
ALTER TABLE "Property" ALTER COLUMN "contactPhone" SET NOT NULL;

CREATE TABLE "RentalRequest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "RentalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "responseMessage" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RentalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalRequest_propertyId_status_idx" ON "RentalRequest"("propertyId", "status");
CREATE INDEX "RentalRequest_renterId_createdAt_idx" ON "RentalRequest"("renterId", "createdAt");

ALTER TABLE "RentalRequest"
    ADD CONSTRAINT "RentalRequest_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalRequest"
    ADD CONSTRAINT "RentalRequest_renterId_fkey"
    FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;