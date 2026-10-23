import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { verifyAdminRole } from "./admin-fns";
import { authMiddleware } from "./auth/middleware";

export interface Testimonial {
  id: number;
  author_name: string;
  author_role: string | null;
  rating: number;
  quote: string;
  avatar_url: string | null;
  verified: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export const getTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const res = await sql<Testimonial>`
    SELECT * FROM testimonials 
    WHERE is_featured = true 
    ORDER BY sort_order ASC, id ASC
  `;
  return res;
});

export const getTestimonialsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    const res = await sql<Testimonial>`
      SELECT * FROM testimonials 
      ORDER BY sort_order ASC, id ASC
    `;
    return res;
  });

export const createTestimonial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      author_name: string;
      author_role?: string;
      rating: number;
      quote: string;
      avatar_url?: string;
      verified?: boolean;
      is_featured?: boolean;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const maxRes = await sql<{ max: number }>`
      SELECT COALESCE(MAX(sort_order), -1) as max FROM testimonials
    `;
    const nextOrder = Number(maxRes[0].max) + 1;

    const res = await sql<Testimonial>`
      INSERT INTO testimonials (
        author_name, author_role, rating, quote, avatar_url, verified, is_featured, sort_order
      ) VALUES (
        ${data.author_name.trim()},
        ${data.author_role?.trim() || null},
        ${Math.min(5, Math.max(1, data.rating || 5))},
        ${data.quote.trim()},
        ${data.avatar_url?.trim() || null},
        ${data.verified ?? true},
        ${data.is_featured ?? true},
        ${nextOrder}
      )
      RETURNING *
    `;
    return res[0];
  });

export const updateTestimonial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      id: number;
      author_name: string;
      author_role?: string;
      rating: number;
      quote: string;
      avatar_url?: string;
      verified?: boolean;
      is_featured?: boolean;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const res = await sql<Testimonial>`
      UPDATE testimonials 
      SET 
        author_name = ${data.author_name.trim()},
        author_role = ${data.author_role?.trim() || null},
        rating = ${Math.min(5, Math.max(1, data.rating || 5))},
        quote = ${data.quote.trim()},
        avatar_url = ${data.avatar_url?.trim() || null},
        verified = ${data.verified ?? true},
        is_featured = ${data.is_featured ?? true}
      WHERE id = ${data.id}
      RETURNING *
    `;
    return res[0];
  });

export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`DELETE FROM testimonials WHERE id = ${data.id}`;
    return { success: true };
  });

export const reorderTestimonials = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { orderedIds: number[] }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    for (let i = 0; i < data.orderedIds.length; i++) {
      await sql`UPDATE testimonials SET sort_order = ${i} WHERE id = ${data.orderedIds[i]}`;
    }

    return { success: true };
  });
