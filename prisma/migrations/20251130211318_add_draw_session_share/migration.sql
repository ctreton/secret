-- CreateTable
CREATE TABLE "DrawSessionShare" (
    "id" TEXT NOT NULL,
    "drawSessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "sharedById" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,

    CONSTRAINT "DrawSessionShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrawSessionShare_token_key" ON "DrawSessionShare"("token");

-- CreateIndex
CREATE INDEX "DrawSessionShare_token_idx" ON "DrawSessionShare"("token");

-- CreateIndex
CREATE INDEX "DrawSessionShare_drawSessionId_idx" ON "DrawSessionShare"("drawSessionId");

-- CreateIndex
CREATE INDEX "DrawSessionShare_email_idx" ON "DrawSessionShare"("email");

-- AddForeignKey
ALTER TABLE "DrawSessionShare" ADD CONSTRAINT "DrawSessionShare_drawSessionId_fkey" FOREIGN KEY ("drawSessionId") REFERENCES "DrawSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawSessionShare" ADD CONSTRAINT "DrawSessionShare_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawSessionShare" ADD CONSTRAINT "DrawSessionShare_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
