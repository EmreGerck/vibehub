-- CreateTable
CREATE TABLE "UserErrorLog" (
    "id" TEXT NOT NULL,
    "errorCode" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "userId" TEXT,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "payloadSnapshot" JSONB NOT NULL DEFAULT '{}',
    "message" TEXT,
    "stack" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserErrorLog_errorCode_createdAt_idx" ON "UserErrorLog"("errorCode", "createdAt");

-- CreateIndex
CREATE INDEX "UserErrorLog_userId_createdAt_idx" ON "UserErrorLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserErrorLog_traceId_idx" ON "UserErrorLog"("traceId");

-- CreateIndex
CREATE INDEX "UserErrorLog_createdAt_idx" ON "UserErrorLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserErrorLog" ADD CONSTRAINT "UserErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
