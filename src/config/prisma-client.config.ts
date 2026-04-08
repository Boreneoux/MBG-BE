import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_URL } from './main.config';
import { PrismaClient } from '../../generated/prisma/client';

const connectionString = `${DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
