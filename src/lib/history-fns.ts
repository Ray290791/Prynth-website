import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";

export const recordProductViewDb = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { slug: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();

    // Insert view record
    await sql`
      INSERT INTO product_views (user_id, slug, viewed_at)
      VALUES (${context.userId}, ${data.slug}, now())
    `;

    return { success: true };
  });

export const getProductHistoryDb = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    // Get latest unique slugs viewed by user, limited to 10
    const res = await sql`
      SELECT slug
      FROM product_views
      WHERE user_id = ${context.userId}
      GROUP BY slug
      ORDER BY max(viewed_at) DESC
      LIMIT 10
    `;
    return res.map(r => r.slug as string);
  });
