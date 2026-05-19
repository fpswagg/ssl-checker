-- CreateTable
CREATE TABLE "OpsNotificationLog" (
    "fingerprint" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lastMessage" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "suppressed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsNotificationLog_pkey" PRIMARY KEY ("fingerprint")
);

-- CreateTable
CREATE TABLE "OpsDigestSend" (
    "id" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorCount" INTEGER NOT NULL,

    CONSTRAINT "OpsDigestSend_pkey" PRIMARY KEY ("id")
);
