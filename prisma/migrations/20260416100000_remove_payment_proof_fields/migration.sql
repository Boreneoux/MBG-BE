-- DropTable (old backup if exists)
DROP TABLE IF EXISTS "payment_method_old";

-- Backup enum values as plain TEXT (not as the enum type, to avoid dependency)
CREATE TABLE "payment_method_old" AS
  SELECT unnest(enum_range(NULL::"payment_method"))::text AS value;

-- Detach orders.payment_method from the enum so we can drop it
ALTER TABLE "orders" ALTER COLUMN "payment_method" TYPE text;

-- Now safe to drop: no columns depend on the type anymore
DROP TYPE "payment_method";

-- Recreate enum with only the desired value
CREATE TYPE "payment_method" AS ENUM ('payment_gateway');

-- Re-attach orders.payment_method to the new enum
-- Rows with values not in the new enum will cause a runtime error here;
-- if that's possible in your data, add a SET DEFAULT / UPDATE step above.
ALTER TABLE "orders"
  ALTER COLUMN "payment_method" TYPE "payment_method"
  USING "payment_method"::"payment_method";

-- Remove the now-unused proof columns
ALTER TABLE "orders"
  DROP COLUMN IF EXISTS "payment_proof",
  DROP COLUMN IF EXISTS "payment_proof_public_id";

-- Drop backup table — not part of the schema, kept only during migration
DROP TABLE IF EXISTS "payment_method_old";
