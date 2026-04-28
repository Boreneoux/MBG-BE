-- AlterTable
ALTER TABLE "user_vouchers" ADD COLUMN     "expired_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "is_referrer_reward" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reward_duration_days" INTEGER;
