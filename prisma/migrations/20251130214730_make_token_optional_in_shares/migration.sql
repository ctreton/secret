-- DropIndex
DROP INDEX "DrawSessionShare_token_idx";

-- AlterTable
ALTER TABLE "DrawSessionShare" ALTER COLUMN "token" DROP NOT NULL,
ALTER COLUMN "tokenExpiry" DROP NOT NULL;
