-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT NOT NULL,
    "technician" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "risers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inspectionId" TEXT NOT NULL,
    "riserNumber" INTEGER NOT NULL,
    "staticPressure" REAL,
    "residualPressure" REAL,
    "controlValveStatus" TEXT,
    "butterflyValveStatus" TEXT,
    "corrosion" TEXT,
    CONSTRAINT "risers_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gauge_readings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "riserId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "pressure" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'psi',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gauge_readings_riserId_fkey" FOREIGN KEY ("riserId") REFERENCES "risers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audioFile" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "inspectionId" TEXT,
    CONSTRAINT "transcriptions_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "technician" TEXT,
    "notes" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
