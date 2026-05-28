import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Category attribute schemas ────────────────────────────────────────────────
//
// Defines the spec form rendered to vendors when editing a product and the
// "Özellikler" panel rendered to customers on the product page. Each field:
//   key       — DB key stored on Product.attributes
//   label     — { tr, en } shown in the UI
//   type      — 'text' | 'select' | 'boolean'
//   options   — required for type='select'; list of allowed values (TR strings)
//   required  — vendor cannot submit without it
//
// Adding/removing a field later: existing products' Product.attributes are not
// migrated — missing keys simply show "—" in the customer panel; obsolete keys
// stay on the row until a vendor edits and resaves. Forward-only, by design.

const CATEGORY_SCHEMAS: Array<{
  slug: string;
  name: string;
  nameEn: string;
  icon: string;
  sortOrder: number;
  vatRate: number;
  attributeSchema: any;
  sizeChartTemplate?: any;
}> = [
  {
    slug: 'tisort',
    name: 'T-Shirt',
    nameEn: 'T-Shirt',
    icon: '👕',
    sortOrder: 10,
    vatRate: 0.20,
    attributeSchema: {
      fields: [
        { key: 'material', label: { tr: 'Kumaş', en: 'Material' }, type: 'select',
          options: ['100% pamuk', '50% pamuk 50% polyester', '70% pamuk 30% polyester', '100% polyester', 'Diğer'],
          required: true },
        { key: 'fit',      label: { tr: 'Kalıp', en: 'Fit' }, type: 'select',
          options: ['regular', 'oversize', 'slim', 'relaxed'] },
        { key: 'gender',   label: { tr: 'Cinsiyet', en: 'Gender' }, type: 'select',
          options: ['unisex', 'kadın', 'erkek'] },
        { key: 'gsm',      label: { tr: 'Gramaj (g/m²)', en: 'Weight (g/m²)' }, type: 'text' },
        { key: 'wash',     label: { tr: 'Yıkama talimatı', en: 'Care instructions' }, type: 'text' },
      ],
    },
    sizeChartTemplate: {
      unit: 'cm',
      measurements: [
        { key: 'chest',  label: { tr: 'Göğüs', en: 'Chest' } },
        { key: 'length', label: { tr: 'Boy',   en: 'Length' } },
        { key: 'shoulder', label: { tr: 'Omuz', en: 'Shoulder' } },
      ],
      sizes: [
        { label: 'S',  chest: 50, length: 70, shoulder: 45 },
        { label: 'M',  chest: 53, length: 72, shoulder: 47 },
        { label: 'L',  chest: 56, length: 74, shoulder: 49 },
        { label: 'XL', chest: 59, length: 76, shoulder: 51 },
      ],
    },
  },
  {
    slug: 'hoodie',
    name: 'Hoodie',
    nameEn: 'Hoodie',
    icon: '🧥',
    sortOrder: 20,
    vatRate: 0.20,
    attributeSchema: {
      fields: [
        { key: 'material', label: { tr: 'Kumaş', en: 'Material' }, type: 'select',
          options: ['100% pamuk', '80% pamuk 20% polyester', '50% pamuk 50% polyester', 'Diğer'], required: true },
        { key: 'fit',      label: { tr: 'Kalıp', en: 'Fit' }, type: 'select',
          options: ['regular', 'oversize', 'slim', 'cropped'] },
        { key: 'gender',   label: { tr: 'Cinsiyet', en: 'Gender' }, type: 'select',
          options: ['unisex', 'kadın', 'erkek'] },
        { key: 'lined',    label: { tr: 'İçi astarlı', en: 'Lined' }, type: 'boolean' },
        { key: 'zipper',   label: { tr: 'Fermuarlı', en: 'Zipped' }, type: 'boolean' },
      ],
    },
    sizeChartTemplate: {
      unit: 'cm',
      measurements: [
        { key: 'chest',  label: { tr: 'Göğüs', en: 'Chest' } },
        { key: 'length', label: { tr: 'Boy',   en: 'Length' } },
        { key: 'sleeve', label: { tr: 'Kol',   en: 'Sleeve' } },
      ],
      sizes: [
        { label: 'S',  chest: 56, length: 68, sleeve: 60 },
        { label: 'M',  chest: 59, length: 70, sleeve: 62 },
        { label: 'L',  chest: 62, length: 72, sleeve: 64 },
        { label: 'XL', chest: 65, length: 74, sleeve: 66 },
      ],
    },
  },
  {
    slug: 'anahtarlik',
    name: 'Anahtarlık',
    nameEn: 'Keychain',
    icon: '🔑',
    sortOrder: 30,
    vatRate: 0.20,
    attributeSchema: {
      fields: [
        { key: 'material', label: { tr: 'Malzeme', en: 'Material' }, type: 'select',
          options: ['reçine', 'metal', 'paslanmaz çelik', 'akrilik', 'ahşap', 'silikon', 'Diğer'], required: true },
        { key: 'nfc',      label: { tr: 'NFC çipli', en: 'NFC enabled' }, type: 'boolean' },
        { key: 'dimensions', label: { tr: 'Ölçüler', en: 'Dimensions' }, type: 'text' },
        { key: 'weight',   label: { tr: 'Ağırlık (g)', en: 'Weight (g)' }, type: 'text' },
      ],
    },
  },
  {
    slug: 'sticker',
    name: 'Sticker',
    nameEn: 'Sticker',
    icon: '🏷️',
    sortOrder: 40,
    vatRate: 0.20,
    attributeSchema: {
      fields: [
        { key: 'material', label: { tr: 'Malzeme', en: 'Material' }, type: 'select',
          options: ['vinil', 'kağıt', 'şeffaf', 'holografik'], required: true },
        { key: 'waterproof', label: { tr: 'Su geçirmez', en: 'Waterproof' }, type: 'boolean' },
        { key: 'dimensions', label: { tr: 'Ölçüler', en: 'Dimensions' }, type: 'text' },
        { key: 'finish',     label: { tr: 'Yüzey', en: 'Finish' }, type: 'select',
          options: ['mat', 'parlak', 'metalik'] },
      ],
    },
  },
  {
    slug: 'plak',
    name: 'Plak',
    nameEn: 'Vinyl',
    icon: '💿',
    sortOrder: 50,
    vatRate: 0.20,
    attributeSchema: {
      fields: [
        { key: 'format',   label: { tr: 'Format', en: 'Format' }, type: 'select',
          options: ['LP (12")', 'EP (10")', 'Single (7")'], required: true },
        { key: 'speed',    label: { tr: 'Devir', en: 'Speed' }, type: 'select',
          options: ['33 RPM', '45 RPM', '78 RPM'] },
        { key: 'color',    label: { tr: 'Plak rengi', en: 'Vinyl color' }, type: 'text' },
        { key: 'weight',   label: { tr: 'Ağırlık (g)', en: 'Weight (g)' }, type: 'select',
          options: ['standart', '140g', '180g'] },
        { key: 'limited', label: { tr: 'Limitli baskı', en: 'Limited edition' }, type: 'boolean' },
      ],
    },
  },
  {
    slug: 'rozet',
    name: 'Rozet',
    nameEn: 'Pin',
    icon: '📍',
    sortOrder: 60,
    vatRate: 0.20,
    attributeSchema: {
      fields: [
        { key: 'material', label: { tr: 'Malzeme', en: 'Material' }, type: 'select',
          options: ['metal', 'emaye', 'pleksi', 'akrilik'], required: true },
        { key: 'finish',   label: { tr: 'Yüzey', en: 'Finish' }, type: 'select',
          options: ['parlak', 'mat', 'gümüş', 'altın'] },
        { key: 'dimensions', label: { tr: 'Ölçüler', en: 'Dimensions' }, type: 'text' },
        { key: 'backType', label: { tr: 'Arka kilit', en: 'Back type' }, type: 'select',
          options: ['kelebek', 'mıknatıs', 'çengelli'] },
      ],
    },
  },
];

async function seedGodUser() {
  const email = process.env.GOD_USER_EMAIL || 'god@vibehub.com.tr';
  const password = process.env.GOD_USER_PASSWORD || 'God@VibeHub2025!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`GOD_USER already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: UserRole.GOD_USER,
      tenantId: null,
    },
  });

  console.log(`GOD_USER seeded: ${email}`);
}

async function seedCategorySchemas() {
  for (const c of CATEGORY_SCHEMAS) {
    // Find by slug first, then fall back to name — existing installs may have
    // categories under a different slug (e.g. "t-shirt" vs "tisort"). If a
    // match is found we only refresh the schema-related fields, leaving
    // admin-tuned values like sortOrder, vatRate, or icon untouched.
    const existing =
      (await prisma.category.findUnique({ where: { slug: c.slug } })) ??
      (await prisma.category.findUnique({ where: { name: c.name } }));

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          attributeSchema:   c.attributeSchema as any,
          sizeChartTemplate: (c.sizeChartTemplate ?? null) as any,
        },
      });
      console.log(`Category schema refreshed: ${existing.slug} (${existing.name})`);
    } else {
      await prisma.category.create({
        data: {
          slug:              c.slug,
          name:              c.name,
          nameEn:            c.nameEn,
          icon:              c.icon,
          sortOrder:         c.sortOrder,
          vatRate:           c.vatRate,
          attributeSchema:   c.attributeSchema as any,
          sizeChartTemplate: (c.sizeChartTemplate ?? null) as any,
        },
      });
      console.log(`Category seeded: ${c.slug}`);
    }
  }
}

async function main() {
  await seedGodUser();
  await seedCategorySchemas();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
