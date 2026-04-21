-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "midtrans_order_id" VARCHAR(255),
ADD COLUMN     "midtrans_status" VARCHAR(50),
ADD COLUMN     "midtrans_transaction_id" VARCHAR(255),
ADD COLUMN     "payment_url" TEXT;
