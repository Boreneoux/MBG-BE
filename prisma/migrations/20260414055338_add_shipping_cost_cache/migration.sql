-- CreateTable
CREATE TABLE "shipping_cost_cache" (
    "id" SERIAL NOT NULL,
    "origin_city_id" INTEGER NOT NULL,
    "destination_city_id" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "courier" VARCHAR(20) NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_cost_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_cost_cache_origin_city_id_destination_city_id_weig_key" ON "shipping_cost_cache"("origin_city_id", "destination_city_id", "weight", "courier");
