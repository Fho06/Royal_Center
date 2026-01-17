import { getPool, sql } from "@/lib/db";

/**
 * Delivery fee rule shape (DB-aligned)
 */
export type DeliveryFeeRule = {
  id: number;
  min_amount: number;
  max_amount: number | null;
  fee: number;
  is_active: boolean;
};

/**
 * Get delivery fee based on cart total
 *
 * Rules:
 * - Uses active rules only
 * - Matches highest min_amount that cart_total satisfies
 * - max_amount = NULL means no upper limit
 */
export async function getDeliveryFee(cartTotal: number): Promise<number> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("cart_total", sql.Decimal(10, 2), cartTotal)
    .query(`
      SELECT TOP 1 fee
      FROM delivery_fee_rules
      WHERE is_active = 1
        AND @cart_total >= min_amount
        AND (
          max_amount IS NULL
          OR @cart_total < max_amount
        )
      ORDER BY min_amount DESC
    `);

  // Safe fallback: no fee if misconfigured
  return result.recordset[0]?.fee ?? 0;
}

/**
 * (Optional) Fetch all rules — useful for admin preview or debugging
 */
export async function getAllDeliveryFeeRules(): Promise<DeliveryFeeRule[]> {
  const pool = await getPool();

  const result = await pool.query(`
    SELECT id, min_amount, max_amount, fee, is_active
    FROM delivery_fee_rules
    ORDER BY min_amount ASC
  `);

  return result.recordset;
}
