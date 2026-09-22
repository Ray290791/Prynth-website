import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { verifyAdminRole } from "./admin-fns";
import { authMiddleware } from "./auth/middleware";

export interface Material {
  id: number;
  code: string;
  name: string;
  tagline: string | null;
  description: string;
  temp_nozzle: string | null;
  temp_bed: string | null;
  heat_resistance: string | null;
  durability_score: number;
  flexibility_score: number;
  print_ease_score: number;
  finish_type: string | null;
  accent_color: string | null;
  benefits: string[];
  drawbacks: string[];
  ideal_for: string[];
  order_index: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

function parseJsonArray(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function mapMaterial(row: any): Material {
  return {
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
    tagline: row.tagline ? String(row.tagline) : null,
    description: String(row.description || ""),
    temp_nozzle: row.temp_nozzle ? String(row.temp_nozzle) : null,
    temp_bed: row.temp_bed ? String(row.temp_bed) : null,
    heat_resistance: row.heat_resistance ? String(row.heat_resistance) : null,
    durability_score: Number(row.durability_score ?? 3),
    flexibility_score: Number(row.flexibility_score ?? 2),
    print_ease_score: Number(row.print_ease_score ?? 5),
    finish_type: row.finish_type ? String(row.finish_type) : null,
    accent_color: row.accent_color ? String(row.accent_color) : "#00B8A9",
    benefits: parseJsonArray(row.benefits),
    drawbacks: parseJsonArray(row.drawbacks),
    ideal_for: parseJsonArray(row.ideal_for),
    order_index: Number(row.order_index ?? 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export const getMaterials = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const res = await sql`SELECT * FROM materials WHERE is_active = true ORDER BY order_index ASC, id ASC`;
  return res.map(mapMaterial);
});

export const getMaterialsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    const res = await sql`SELECT * FROM materials ORDER BY order_index ASC, id ASC`;
    return res.map(mapMaterial);
  });

export type MaterialInput = {
  code: string;
  name: string;
  tagline?: string;
  description: string;
  temp_nozzle?: string;
  temp_bed?: string;
  heat_resistance?: string;
  durability_score?: number;
  flexibility_score?: number;
  print_ease_score?: number;
  finish_type?: string;
  accent_color?: string;
  benefits: string[];
  drawbacks: string[];
  ideal_for: string[];
  is_active?: boolean;
};

export const createMaterial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: MaterialInput) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const maxRes = await sql<{ max: number }>`SELECT COALESCE(MAX(order_index), -1) as max FROM materials`;
    const nextOrder = Number(maxRes[0].max) + 1;

    const res = await sql`
      INSERT INTO materials (
        code, name, tagline, description, temp_nozzle, temp_bed, heat_resistance,
        durability_score, flexibility_score, print_ease_score, finish_type, accent_color,
        benefits, drawbacks, ideal_for, order_index, is_active
      ) VALUES (
        ${data.code.toLowerCase().trim()},
        ${data.name.trim()},
        ${data.tagline?.trim() || null},
        ${data.description.trim()},
        ${data.temp_nozzle?.trim() || null},
        ${data.temp_bed?.trim() || null},
        ${data.heat_resistance?.trim() || null},
        ${data.durability_score ?? 3},
        ${data.flexibility_score ?? 2},
        ${data.print_ease_score ?? 5},
        ${data.finish_type?.trim() || null},
        ${data.accent_color?.trim() || '#00B8A9'},
        ${JSON.stringify(data.benefits || [])},
        ${JSON.stringify(data.drawbacks || [])},
        ${JSON.stringify(data.ideal_for || [])},
        ${nextOrder},
        ${data.is_active ?? true}
      )
      RETURNING *
    `;

    return mapMaterial(res[0]);
  });

export const updateMaterial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number } & Partial<MaterialInput>) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const existing = await sql`SELECT * FROM materials WHERE id = ${data.id}`;
    if (!existing.length) throw new Error("Material not found");
    const current = existing[0];

    const res = await sql`
      UPDATE materials SET
        code = ${data.code ? data.code.toLowerCase().trim() : current.code},
        name = ${data.name !== undefined ? data.name.trim() : current.name},
        tagline = ${data.tagline !== undefined ? (data.tagline?.trim() || null) : current.tagline},
        description = ${data.description !== undefined ? data.description.trim() : current.description},
        temp_nozzle = ${data.temp_nozzle !== undefined ? (data.temp_nozzle?.trim() || null) : current.temp_nozzle},
        temp_bed = ${data.temp_bed !== undefined ? (data.temp_bed?.trim() || null) : current.temp_bed},
        heat_resistance = ${data.heat_resistance !== undefined ? (data.heat_resistance?.trim() || null) : current.heat_resistance},
        durability_score = ${data.durability_score !== undefined ? data.durability_score : current.durability_score},
        flexibility_score = ${data.flexibility_score !== undefined ? data.flexibility_score : current.flexibility_score},
        print_ease_score = ${data.print_ease_score !== undefined ? data.print_ease_score : current.print_ease_score},
        finish_type = ${data.finish_type !== undefined ? (data.finish_type?.trim() || null) : current.finish_type},
        accent_color = ${data.accent_color !== undefined ? (data.accent_color?.trim() || '#00B8A9') : current.accent_color},
        benefits = ${data.benefits !== undefined ? JSON.stringify(data.benefits) : JSON.stringify(current.benefits)},
        drawbacks = ${data.drawbacks !== undefined ? JSON.stringify(data.drawbacks) : JSON.stringify(current.drawbacks)},
        ideal_for = ${data.ideal_for !== undefined ? JSON.stringify(data.ideal_for) : JSON.stringify(current.ideal_for)},
        is_active = ${data.is_active !== undefined ? data.is_active : current.is_active},
        updated_at = NOW()
      WHERE id = ${data.id}
      RETURNING *
    `;

    return mapMaterial(res[0]);
  });

export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`DELETE FROM materials WHERE id = ${data.id}`;
    return { success: true };
  });
