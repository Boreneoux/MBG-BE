import "dotenv/config";
import { defineConfig } from "prisma/config";

// DIRECT_URL = Neon direct connection (used by migrations — pooler doesn't support DDL)
// DATABASE_URL = Neon pooled connection (used by PrismaClient at runtime via prisma-client.config.ts)
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
