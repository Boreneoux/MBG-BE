-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_proof_public_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "public_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_image_public_id" VARCHAR(255);
