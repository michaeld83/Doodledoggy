-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Dog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registeredName" TEXT NOT NULL,
    "callName" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "microchip" TEXT,
    "registration" TEXT,
    "photoPath" TEXT,
    "notes" TEXT,
    "motherId" TEXT,
    "fatherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dog_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Dog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dog_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Dog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Litter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "damId" TEXT NOT NULL,
    "sireId" TEXT NOT NULL,
    "whelpDate" DATETIME,
    "expectedDate" DATETIME,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Litter_damId_fkey" FOREIGN KEY ("damId") REFERENCES "Dog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Litter_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "Dog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Puppy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "litterId" TEXT NOT NULL,
    "tempName" TEXT NOT NULL,
    "sex" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "pickPosition" INTEGER,
    "dogId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Puppy_litterId_fkey" FOREIGN KEY ("litterId") REFERENCES "Litter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Puppy_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "Dog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "litterId" TEXT NOT NULL,
    "puppyId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "buyerPhone" TEXT,
    "depositAmount" REAL NOT NULL,
    "paymentMethod" TEXT,
    "paidWhere" TEXT,
    "pickPosition" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "docusignEnvelopeId" TEXT,
    "docusignStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_litterId_fkey" FOREIGN KEY ("litterId") REFERENCES "Litter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_puppyId_fkey" FOREIGN KEY ("puppyId") REFERENCES "Puppy" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dogId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "recordDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followUpAt" DATETIME,
    "filePath" TEXT,
    "fileName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HealthRecord_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "Dog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatingCoiCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "litterId" TEXT,
    "damId" TEXT NOT NULL,
    "sireId" TEXT NOT NULL,
    "coiPercent" REAL NOT NULL,
    "generations" INTEGER NOT NULL,
    "commonAncestors" TEXT NOT NULL,
    "highRelatedness" BOOLEAN NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" DATETIME,
    "warningMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatingCoiCheck_litterId_fkey" FOREIGN KEY ("litterId") REFERENCES "Litter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "externalId" TEXT,
    "rawPayload" TEXT,
    "reservationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inquiry_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Dog_status_idx" ON "Dog"("status");

-- CreateIndex
CREATE INDEX "Dog_callName_idx" ON "Dog"("callName");

-- CreateIndex
CREATE UNIQUE INDEX "Puppy_dogId_key" ON "Puppy"("dogId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_puppyId_key" ON "Reservation"("puppyId");

-- CreateIndex
CREATE INDEX "HealthRecord_dogId_idx" ON "HealthRecord"("dogId");

-- CreateIndex
CREATE INDEX "HealthRecord_followUpAt_idx" ON "HealthRecord"("followUpAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_externalId_key" ON "Inquiry"("externalId");

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Inquiry_email_idx" ON "Inquiry"("email");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_source_idx" ON "Inquiry"("source");

