import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.GOD_USER_EMAIL || 'god@merchstage.io';
  const password = process.env.GOD_USER_PASSWORD || 'God@MerchStage2025!';

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
