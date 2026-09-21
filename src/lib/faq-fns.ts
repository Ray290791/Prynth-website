import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { verifyAdminRole } from "./admin-fns";
import { authMiddleware } from "./auth/middleware";

export interface Faq {
  id: number;
  question: string;
  answer: string;
  order_index: number;
  created_at: string;
}

export const getFaqs = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const res = await sql<Faq>`SELECT * FROM faqs ORDER BY order_index ASC, id ASC`;
  return res;
});

export const getFaqsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    const res = await sql<Faq>`SELECT * FROM faqs ORDER BY order_index ASC, id ASC`;
    return res;
  });

export const createFaq = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { question: string; answer: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    
    // Get max order_index
    const maxRes = await sql<{max: number}>`SELECT COALESCE(MAX(order_index), -1) as max FROM faqs`;
    const nextOrder = Number(maxRes[0].max) + 1;
    
    const res = await sql<Faq>`
      INSERT INTO faqs (question, answer, order_index) 
      VALUES (${data.question}, ${data.answer}, ${nextOrder}) 
      RETURNING *
    `;
    return res[0];
  });

export const updateFaq = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number; question: string; answer: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    
    const res = await sql<Faq>`
      UPDATE faqs 
      SET question = ${data.question}, answer = ${data.answer} 
      WHERE id = ${data.id} 
      RETURNING *
    `;
    return res[0];
  });

export const deleteFaq = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    
    await sql`DELETE FROM faqs WHERE id = ${data.id}`;
    return { success: true };
  });

export const reorderFaqs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { orderedIds: number[] }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    
    for (let i = 0; i < data.orderedIds.length; i++) {
      await sql`UPDATE faqs SET order_index = ${i} WHERE id = ${data.orderedIds[i]}`;
    }
    
    return { success: true };
  });
