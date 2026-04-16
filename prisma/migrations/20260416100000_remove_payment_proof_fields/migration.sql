-- DropTable
DROP TABLE IF EXISTS "payment_method_old";

-- CreateTable
CREATE TABLE "payment_method_old" AS SELECT unnest(enum_range(NULL::"payment_method")) AS value;

-- DropEnum
DROP TYPE "payment_method";

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('payment_gateway');

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "payment_proof",
DROP COLUMN "payment_proof_public_id";