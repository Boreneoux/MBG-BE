import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'magerbeligroser.dev@gmail.com';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Super admin with email "${email}" already exists. Skipping.`);
    return;
  }

  const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email,
      first_name: 'Super',
      last_name: 'Admin',
      password: hashedPassword,
      role: 'super_admin',
      is_verified: true,
    },
  });

  console.log(`Super admin created: ${superAdmin.email} (id: ${superAdmin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
