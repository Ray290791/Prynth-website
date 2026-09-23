import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware, optionalAuthMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";

export const getWishlist = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const res = await sql`
      SELECT w.*, p.name, p.price, p.image, p.category, p.in_stock 
      FROM wishlists w 
      JOIN products p ON w.product_slug = p.slug 
      WHERE w.user_id = ${context.userId} 
      ORDER BY w.created_at DESC
    `;
    return res as any[];
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((product_slug: string) => product_slug)
  .handler(async ({ data: slug, context }) => {
    const sql = await getSql();
    const existing = await sql`SELECT id FROM wishlists WHERE user_id = ${context.userId} AND product_slug = ${slug}`;
    if (existing.length > 0) {
      await sql`DELETE FROM wishlists WHERE id = ${existing[0].id}`;
      return { added: false };
    } else {
      await sql`INSERT INTO wishlists (user_id, product_slug) VALUES (${context.userId}, ${slug})`;
      return { added: true };
    }
  });

export const getRecentlyViewed = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const res = await sql`
      SELECT r.*, p.name, p.price, p.image 
      FROM recently_viewed r 
      JOIN products p ON r.product_slug = p.slug 
      WHERE r.user_id = ${context.userId} 
      ORDER BY r.viewed_at DESC 
      LIMIT 10
    `;
    return res as any[];
  });

export const trackProductView = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((product_slug: string) => product_slug)
  .handler(async ({ data: slug, context }) => {
    const sql = await getSql();
    await sql`
      INSERT INTO recently_viewed (user_id, product_slug, viewed_at) 
      VALUES (${context.userId}, ${slug}, now()) 
      ON CONFLICT (user_id, product_slug) 
      DO UPDATE SET viewed_at = now()
    `;
    return { success: true };
  });

export const validateCoupon = createServerFn({ method: "POST" })
  .validator((code: string) => code)
  .handler(async ({ data: code }) => {
    const sql = await getSql();
    const res = await sql`
      SELECT * FROM coupons 
      WHERE code = ${code.toUpperCase()} 
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR current_uses < max_uses)
    `;
    if (res.length === 0) {
      throw new Error("Invalid or expired coupon");
    }
    return res[0] as { code: string; discount_percent: number };
  });

export const getCouponsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    // Admin check: verify if the current user is the admin
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }
    const res = await sql`SELECT * FROM coupons ORDER BY created_at DESC`;
    return res as any[];
  });

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { code: string; discount_percent: number; max_uses?: number }) => {
    const code = data.code?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9_-]{2,30}$/.test(code)) {
      throw new Error("Coupon code must be 2 to 30 alphanumeric characters.");
    }
    const discount = Number(data.discount_percent);
    if (isNaN(discount) || discount < 1 || discount > 100) {
      throw new Error("Discount percentage must be between 1% and 100%.");
    }
    const maxUses = data.max_uses ? Math.max(1, Math.floor(Number(data.max_uses))) : null;
    return { code, discount_percent: discount, max_uses: maxUses ?? undefined };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }
    await sql`
      INSERT INTO coupons (code, discount_percent, max_uses)
      VALUES (${data.code}, ${data.discount_percent}, ${data.max_uses || null})
    `;
    return { success: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: string) => code)
  .handler(async ({ data: code, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }
    await sql`DELETE FROM coupons WHERE LOWER(code) = LOWER(${code})`;
    return { success: true };
  });

export const touchUserActivity = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    if (context.userId && context.userId !== "dev-user") {
      try {
        const sql = await getSql();
        await sql`
          UPDATE "session" 
          SET "updatedAt" = NOW() 
          WHERE "userId" = ${context.userId} 
            AND "expiresAt" > NOW() 
            AND "updatedAt" < NOW() - INTERVAL '1 minute'
        `;
      } catch (err) {
        // non-blocking fail-safe
      }
    }
    return { ok: true };
  });

export const getAnalyticsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }

    // Refresh caller's active session timestamp immediately
    if (context.userId && context.userId !== "dev-user") {
      try {
        await sql`
          UPDATE "session" 
          SET "updatedAt" = NOW() 
          WHERE "userId" = ${context.userId} 
            AND "expiresAt" > NOW()
        `;
      } catch (err) {
        console.error("Failed to touch admin session:", err);
      }
    }

    const ordersRes = await sql<any>`SELECT total, created_at, status FROM orders WHERE status != 'cancelled' ORDER BY created_at ASC`;
    const usersRes = await sql<any>`SELECT "createdAt" FROM "user" ORDER BY "createdAt" ASC`;
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const activeSessionsRes = await sql<any>`
      SELECT id, "userId", "updatedAt" 
      FROM "session" 
      WHERE "updatedAt" >= ${oneDayAgo}
        AND "expiresAt" > NOW()
    `;

    // Calculate totals
    const totalRevenue = ordersRes.reduce((acc, o) => acc + parseFloat(o.total || "0"), 0);
    const totalOrders = ordersRes.length;
    const totalUsers = usersRes.length;

    // Count unique users active in last 24h
    const activeUserIds24h = new Set(activeSessionsRes.map((s: any) => s.userId));
    if (context.userId) {
      activeUserIds24h.add(context.userId);
    }
    const activeUsers24h = activeUserIds24h.size;

    // Count unique users active in last 10 minutes
    const activeUserIds10m = new Set(
      activeSessionsRes
        .filter((s: any) => new Date(s.updatedAt) >= new Date(tenMinutesAgo))
        .map((s: any) => s.userId)
    );
    if (context.userId) {
      activeUserIds10m.add(context.userId);
    }
    const activeUsers10m = activeUserIds10m.size;

    // Time-series grouping function
    const groupByDate = (items: any[], dateKey: string, valueFn: (item: any) => number) => {
      const grouped: Record<string, number> = {};
      items.forEach(item => {
        const date = new Date(item[dateKey]).toISOString().split('T')[0];
        grouped[date] = (grouped[date] || 0) + valueFn(item);
      });
      return Object.entries(grouped).map(([date, value]) => ({ date, value }));
    };

    const revenueOverTime = groupByDate(ordersRes, 'created_at', o => parseFloat(o.total || "0"));
    const ordersOverTime = groupByDate(ordersRes, 'created_at', () => 1);
    const usersJoinedOverTime = groupByDate(usersRes, 'createdAt', () => 1);

    return {
      revenue: totalRevenue,
      ordersCount: totalOrders,
      usersCount: totalUsers,
      activeUsers24h,
      activeUsers10m,
      revenueOverTime,
      ordersOverTime,
      usersJoinedOverTime
    };
  });

export const upsertCartSession = createServerFn({ method: "POST" })
  .validator((data: { id: string; email?: string; items: any[] }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    // Use user_id if we have one (from the optional middleware context, but since this endpoint 
    // isn't strictly behind authMiddleware, we must check if context exists).
    // Actually, createServerFn context without middleware is just {}. We'll pass user_id explicitly or extract from auth.
    // To keep it simple, we just save it against the session ID.
    const itemsJson = JSON.stringify(data.items);
    await sql`
      INSERT INTO cart_sessions (id, email, items, updated_at)
      VALUES (${data.id}, ${data.email || null}, ${itemsJson}, now())
      ON CONFLICT (id) DO UPDATE 
      SET email = COALESCE(${data.email || null}, cart_sessions.email),
          items = ${itemsJson},
          updated_at = now()
    `;
    return { success: true };
  });

export const getCartSession = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const sql = await getSql();
    const res = await sql`SELECT * FROM cart_sessions WHERE id = ${id}`;
    if (res.length === 0) return null;
    return res[0] as any;
  });
