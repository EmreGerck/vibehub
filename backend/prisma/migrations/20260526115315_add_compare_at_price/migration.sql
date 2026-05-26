-- AlterTable
ALTER TABLE "ForumSettings" ALTER COLUMN "bannedKeywords" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "compareAtPrice" DECIMAL(12,2);
