-- DropIndex
DROP INDEX "DrawSessionShare_token_key";

-- CreateIndex
CREATE INDEX "DrawSessionShare_token_idx" ON "DrawSessionShare"("token");
