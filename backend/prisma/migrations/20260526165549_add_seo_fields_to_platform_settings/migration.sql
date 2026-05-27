-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "ogImageUrl" TEXT,
ADD COLUMN     "robotsTxt" TEXT NOT NULL DEFAULT 'User-agent: *
Allow: /

Sitemap: https://vibehub.com.tr/sitemap.xml',
ADD COLUMN     "schemaOrgJson" TEXT,
ADD COLUMN     "twitterHandle" TEXT;
