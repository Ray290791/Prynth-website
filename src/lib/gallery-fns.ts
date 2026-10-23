import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { verifyAdminRole } from "./admin-fns";
import { authMiddleware } from "./auth/middleware";

export interface GalleryItem {
  id: number;
  title: string;
  caption: string | null;
  image_url: string | null;
  material: string | null;
  tag: string | null;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
}

export const getGalleryItems = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const res = await sql<GalleryItem>`
    SELECT * FROM gallery_items 
    WHERE is_featured = true 
    ORDER BY sort_order ASC, id ASC
  `;
  return res;
});

export const getGalleryAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    const res = await sql<GalleryItem>`
      SELECT * FROM gallery_items 
      ORDER BY sort_order ASC, id ASC
    `;
    return res;
  });

export const createGalleryItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      title: string;
      caption?: string;
      image_url?: string;
      material?: string;
      tag?: string;
      is_featured?: boolean;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const maxRes = await sql<{ max: number }>`
      SELECT COALESCE(MAX(sort_order), -1) as max FROM gallery_items
    `;
    const nextOrder = Number(maxRes[0].max) + 1;

    const res = await sql<GalleryItem>`
      INSERT INTO gallery_items (
        title, caption, image_url, material, tag, sort_order, is_featured
      ) VALUES (
        ${data.title.trim()},
        ${data.caption?.trim() || null},
        ${data.image_url?.trim() || null},
        ${data.material?.trim() || null},
        ${data.tag?.trim() || null},
        ${nextOrder},
        ${data.is_featured ?? true}
      )
      RETURNING *
    `;
    return res[0];
  });

export const updateGalleryItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: {
      id: number;
      title: string;
      caption?: string;
      image_url?: string;
      material?: string;
      tag?: string;
      is_featured?: boolean;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const res = await sql<GalleryItem>`
      UPDATE gallery_items 
      SET 
        title = ${data.title.trim()},
        caption = ${data.caption?.trim() || null},
        image_url = ${data.image_url?.trim() || null},
        material = ${data.material?.trim() || null},
        tag = ${data.tag?.trim() || null},
        is_featured = ${data.is_featured ?? true}
      WHERE id = ${data.id}
      RETURNING *
    `;
    return res[0];
  });

export const deleteGalleryItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`DELETE FROM gallery_items WHERE id = ${data.id}`;
    return { success: true };
  });

export const reorderGallery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { orderedIds: number[] }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    for (let i = 0; i < data.orderedIds.length; i++) {
      await sql`UPDATE gallery_items SET sort_order = ${i} WHERE id = ${data.orderedIds[i]}`;
    }

    return { success: true };
  });
