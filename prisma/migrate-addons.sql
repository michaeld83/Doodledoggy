-- Idempotent ALTER script for existing Turso / SQLite DBs.
-- Safe to re-run: each statement catches "duplicate column" at the migrate API layer.

-- Litter
ALTER TABLE "Litter" ADD COLUMN "breedType" TEXT;

-- Reservation: customer + paid + fee add-ons
ALTER TABLE "Reservation" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Reservation" ADD COLUMN "snugglePuppy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Reservation" ADD COLUMN "snugglePuppyAmount" REAL;
ALTER TABLE "Reservation" ADD COLUMN "travelBag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Reservation" ADD COLUMN "travelBagAmount" REAL;
ALTER TABLE "Reservation" ADD COLUMN "travelArrangements" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Reservation" ADD COLUMN "travelArrangementsNotes" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "travelArrangementsAmount" REAL;
ALTER TABLE "Reservation" ADD COLUMN "customFeesJson" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "feesTotal" REAL;

-- Customer table (create if missing handled in migrate route)
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "reservationId" TEXT,
    "litterId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "feesJson" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "docusignEnvelopeId" TEXT,
    "docusignStatus" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Dog_breed_idx" ON "Dog"("breed");
CREATE INDEX IF NOT EXISTS "Customer_name_idx" ON "Customer"("name");
CREATE INDEX IF NOT EXISTS "Customer_email_idx" ON "Customer"("email");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "Reservation_customerId_idx" ON "Reservation"("customerId");
CREATE INDEX IF NOT EXISTS "Reservation_status_idx" ON "Reservation"("status");
CREATE INDEX IF NOT EXISTS "Contract_customerId_idx" ON "Contract"("customerId");
CREATE INDEX IF NOT EXISTS "Contract_status_idx" ON "Contract"("status");
