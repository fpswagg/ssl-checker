-- CreateEnum
CREATE TYPE "SslStatus" AS ENUM ('OK', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "NotificationEmail" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredUrl" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoredUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredUrlOnEmail" (
    "urlId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,

    CONSTRAINT "MonitoredUrlOnEmail_pkey" PRIMARY KEY ("urlId","emailId")
);

-- CreateTable
CREATE TABLE "SslCheckResult" (
    "id" TEXT NOT NULL,
    "urlId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SslStatus" NOT NULL,
    "validTo" TIMESTAMP(3),
    "daysRemaining" INTEGER,
    "issuer" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "SslCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "urlId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resendId" TEXT,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationEmail_address_key" ON "NotificationEmail"("address");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredUrl_url_key" ON "MonitoredUrl"("url");

-- CreateIndex
CREATE INDEX "SslCheckResult_urlId_checkedAt_idx" ON "SslCheckResult"("urlId", "checkedAt");

-- CreateIndex
CREATE INDEX "AlertDelivery_urlId_kind_sentAt_idx" ON "AlertDelivery"("urlId", "kind", "sentAt");

-- AddForeignKey
ALTER TABLE "MonitoredUrlOnEmail" ADD CONSTRAINT "MonitoredUrlOnEmail_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "MonitoredUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredUrlOnEmail" ADD CONSTRAINT "MonitoredUrlOnEmail_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "NotificationEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SslCheckResult" ADD CONSTRAINT "SslCheckResult_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "MonitoredUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "MonitoredUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;
