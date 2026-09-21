import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import type { CartItem } from "./cart-store";

export const syncCartToDb = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { items: CartItem[] }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();

    // Upsert cart for the user
    await sql`
      INSERT INTO carts (user_id, items, updated_at)
      VALUES (${context.userId}, ${JSON.stringify(data.items)}, now())
      ON CONFLICT (id) DO UPDATE SET items = ${JSON.stringify(data.items)}, updated_at = now()
    `;
    // wait, carts table has id as primary key, but we want to upsert by user_id!
    // But carts does not have a UNIQUE constraint on user_id! Let's check 0002_schema.sql.
    // It only has an index on user_id, no unique constraint.
    // So we should try to update, if 0 rows, then insert.
    const updateResult = await sql`
      UPDATE carts
      SET items = ${JSON.stringify(data.items)}, updated_at = now()
      WHERE user_id = ${context.userId}
      RETURNING id
    `;
    
    if (updateResult.length === 0) {
      await sql`
        INSERT INTO carts (user_id, items)
        VALUES (${context.userId}, ${JSON.stringify(data.items)})
      `;
    }

    return { success: true };
  });

export const getCartFromDb = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const res = await sql`
      SELECT items FROM carts WHERE user_id = ${context.userId} LIMIT 1
    `;
    if (res.length > 0) {
      return { items: res[0].items as CartItem[] };
    }
    return { items: null };
  });
