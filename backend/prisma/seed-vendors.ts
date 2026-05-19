import { PrismaClient, UserRole, ArtistType, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ── KALT tenant ───────────────────────────────────────────────────────────────
  const kalt = await prisma.tenant.upsert({
    where: { slug: 'kalt' },
    update: {},
    create: {
      slug: 'kalt',
      displayName: 'KALT',
      artistType: ArtistType.ARTIST,
      status: TenantStatus.ACTIVE,
      commissionRate: 0.1,
      bio: 'Turkish podcast celebrities — engaging conversations & stories',
    },
  });
  console.log(`Tenant KALT: ${kalt.id}`);

  const kaltHash = await bcrypt.hash('Kalt@VibeHub2025!', 12);
  const kaltUser = await prisma.user.upsert({
    where: { email: 'kalt@vibehub.io' },
    update: {},
    create: {
      email: 'kalt@vibehub.io',
      passwordHash: kaltHash,
      role: UserRole.VENDOR_OWNER,
      tenantId: kalt.id,
    },
  });
  console.log(`User KALT owner: ${kaltUser.email}`);

  // ── MODE XL tenant ────────────────────────────────────────────────────────────
  const modeXl = await prisma.tenant.upsert({
    where: { slug: 'mode-xl' },
    update: {},
    create: {
      slug: 'mode-xl',
      displayName: 'MODE XL',
      artistType: ArtistType.BAND,
      status: TenantStatus.ACTIVE,
      commissionRate: 0.1,
      bio: 'Turkish rap collective — street sounds & urban vibes',
    },
  });
  console.log(`Tenant MODE XL: ${modeXl.id}`);

  const modeXlHash = await bcrypt.hash('ModXL@VibeHub2025!', 12);
  const modeXlUser = await prisma.user.upsert({
    where: { email: 'modexl@vibehub.io' },
    update: {},
    create: {
      email: 'modexl@vibehub.io',
      passwordHash: modeXlHash,
      role: UserRole.VENDOR_OWNER,
      tenantId: modeXl.id,
    },
  });
  console.log(`User MODE XL owner: ${modeXlUser.email}`);

  // ── TEKİR tenant ──────────────────────────────────────────────────────────────
  const tekir = await prisma.tenant.upsert({
    where: { slug: 'tekir' },
    update: {},
    create: {
      slug: 'tekir',
      displayName: 'TEKİR',
      artistType: ArtistType.ARTIST,
      status: TenantStatus.ACTIVE,
      commissionRate: 0.1,
      bio: 'VibeHub x TEKİR — exclusive collection',
    },
  });
  console.log(`Tenant TEKİR: ${tekir.id}`);

  const tekirHash = await bcrypt.hash('Tekir@VibeHub2025!', 12);
  const tekirUser = await prisma.user.upsert({
    where: { email: 'tekir@vibehub.io' },
    update: {},
    create: {
      email: 'tekir@vibehub.io',
      passwordHash: tekirHash,
      role: UserRole.VENDOR_OWNER,
      tenantId: tekir.id,
    },
  });
  console.log(`User TEKİR owner: ${tekirUser.email}`);

  // ── Hero Banners ──────────────────────────────────────────────────────────────

  // Banner 1 — MODE XL
  const banner1 = await prisma.heroBanner.upsert({
    where: { id: 'banner-mode-xl-seed' },
    update: {},
    create: {
      id: 'banner-mode-xl-seed',
      tenantId: modeXl.id,
      title: 'MODE XL',
      subtitle: 'VibeHub x MODE XL',
      heading: 'Official Merch Drop: Mode XL',
      description:
        'Limited-run tees, hoodies, and accessories crafted for the Mode XL rap collective—premium blanks, bold graphics, and tour-ready quality.',
      buttonText: 'Shop MODE XL',
      buttonLink: '/store/mode-xl',
      imageUrl: '/images/mode-xl.jpg',
      gradient:
        'radial-gradient(1200px 600px at 20% 10%, rgba(124, 58, 237, 0.35), transparent 55%), radial-gradient(900px 500px at 85% 30%, rgba(236, 72, 153, 0.28), transparent 60%), linear-gradient(135deg, #070A12 0%, #0B1022 45%, #070A12 100%)',
      buttonGradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 55%, #F97316 100%)',
      sortOrder: 0,
      active: true,
    },
  });
  console.log(`Banner MODE XL: ${banner1.id}`);

  // Banner 2 — KALT
  const banner2 = await prisma.heroBanner.upsert({
    where: { id: 'banner-kalt-seed' },
    update: {},
    create: {
      id: 'banner-kalt-seed',
      tenantId: kalt.id,
      title: 'KALT',
      subtitle: 'VibeHub x KALT',
      heading: 'Signature Collection: KALT',
      description:
        "Designed for KALT's fans across Turkey—sleek silhouettes, elevated details, and a refined palette built for everyday wear.",
      buttonText: 'Shop KALT',
      buttonLink: '/store/kalt',
      imageUrl: '/images/kalt.jpg',
      gradient:
        'radial-gradient(1100px 520px at 18% 18%, rgba(34, 211, 238, 0.22), transparent 55%), radial-gradient(900px 520px at 85% 20%, rgba(124, 58, 237, 0.22), transparent 60%), linear-gradient(135deg, rgb(6, 10, 16) 0%, rgb(7, 24, 38) 45%, rgb(6, 10, 16) 100%)',
      buttonGradient: 'linear-gradient(135deg, #22D3EE 0%, #7C3AED 55%, #0EA5E9 100%)',
      sortOrder: 1,
      active: true,
    },
  });
  console.log(`Banner KALT: ${banner2.id}`);

  // Banner 3 — TEKİR
  const banner3 = await prisma.heroBanner.upsert({
    where: { id: 'banner-tekir-seed' },
    update: {},
    create: {
      id: 'banner-tekir-seed',
      tenantId: tekir.id,
      title: 'TEKİR',
      subtitle: 'VibeHub x TEKİR',
      heading: 'Exclusive Collection: TEKİR',
      description:
        'Premium merch drops curated for TEKİR\'s fans — bold designs, quality materials, and a style that speaks for itself.',
      buttonText: 'Shop TEKİR',
      buttonLink: '/store/tekir',
      imageUrl: null,
      gradient:
        'radial-gradient(1100px 520px at 18% 18%, rgba(239, 68, 68, 0.25), transparent 55%), radial-gradient(900px 520px at 85% 20%, rgba(251, 146, 60, 0.2), transparent 60%), linear-gradient(135deg, #0f0008 0%, #1a0010 45%, #0f0008 100%)',
      buttonGradient: 'linear-gradient(135deg, #EF4444 0%, #F97316 55%, #EAB308 100%)',
      sortOrder: 2,
      active: true,
    },
  });
  console.log(`Banner TEKİR: ${banner3.id}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
