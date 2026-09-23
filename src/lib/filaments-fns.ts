import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";
import { z } from "zod";

export type FilamentStatus = "in_stock" | "low_stock" | "filament_over";

export interface FilamentRecord {
  id: string;
  name: string;
  material_id: string; // 'pla' | 'petg' | 'tpu' | 'abs'
  color_id: string; // 'charcoal' | 'teal' | 'bone' | etc.
  color_name: string;
  color_hex: string;
  spool_count: number;
  status: FilamentStatus;
  brand: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_FILAMENTS: FilamentRecord[] = [
  // PLA Filaments
  {
    id: "fil-pla-charcoal",
    name: "Bambu Matte Charcoal PLA",
    material_id: "pla",
    color_id: "charcoal",
    color_name: "Charcoal",
    color_hex: "#2A2E32",
    spool_count: 5,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Default everyday matte dark tone",
  },
  {
    id: "fil-pla-teal",
    name: "Bambu Basic Teal PLA",
    material_id: "pla",
    color_id: "teal",
    color_name: "Teal",
    color_hex: "#00B8A9",
    spool_count: 4,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Signature Prynth teal accent",
  },
  {
    id: "fil-pla-bone",
    name: "Bambu Matte Bone White PLA",
    material_id: "pla",
    color_id: "bone",
    color_name: "Bone White",
    color_hex: "#EFEBE3",
    spool_count: 6,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Warm architectural off-white",
  },
  {
    id: "fil-pla-stone",
    name: "Bambu Basic Stone Grey PLA",
    material_id: "pla",
    color_id: "stone",
    color_name: "Stone Grey",
    color_hex: "#9AA0A6",
    spool_count: 3,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Neutral concrete grey",
  },
  {
    id: "fil-pla-green",
    name: "Bambu Slicer Green PLA",
    material_id: "pla",
    color_id: "bambu_green",
    color_name: "Bambu Green",
    color_hex: "#00ae42",
    spool_count: 2,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Signature Bambu Lab green",
  },
  {
    id: "fil-pla-orange",
    name: "Bambu Basic Signal Orange PLA",
    material_id: "pla",
    color_id: "orange",
    color_name: "Signal Orange",
    color_hex: "#ff6a00",
    spool_count: 3,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "High-visibility safety accent",
  },

  // PETG Filaments
  {
    id: "fil-petg-black",
    name: "Bambu Basic Jet Black PETG",
    material_id: "petg",
    color_id: "black",
    color_name: "Jet Black",
    color_hex: "#16181b",
    spool_count: 4,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "High gloss durable chemical-resistant",
  },
  {
    id: "fil-petg-clear",
    name: "Bambu Translucent Clear PETG",
    material_id: "petg",
    color_id: "clear",
    color_name: "Translucent Clear",
    color_hex: "#e2e8f0",
    spool_count: 2,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Semi-transparent light diffusing",
  },
  {
    id: "fil-petg-grey",
    name: "Bambu Slate Grey PETG",
    material_id: "petg",
    color_id: "slate",
    color_name: "Slate Grey",
    color_hex: "#64748b",
    spool_count: 3,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Functional industrial brackets",
  },

  // TPU Filaments
  {
    id: "fil-tpu-black",
    name: "Bambu TPU 95A Black",
    material_id: "tpu",
    color_id: "charcoal",
    color_name: "Charcoal Black",
    color_hex: "#1f2428",
    spool_count: 2,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Flexible gaskets and phone bumpers",
  },
  {
    id: "fil-tpu-teal",
    name: "Bambu TPU 95A Neon Teal",
    material_id: "tpu",
    color_id: "teal",
    color_name: "Vibrant Teal",
    color_hex: "#06b6d4",
    spool_count: 2,
    status: "in_stock",
    brand: "Bambu Lab",
    notes: "Flexible wristbands and accents",
  },
];

async function ensureFilamentsTable(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS filaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        material_id TEXT NOT NULL,
        color_id TEXT NOT NULL,
        color_name TEXT NOT NULL,
        color_hex TEXT NOT NULL,
        spool_count INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'in_stock',
        brand TEXT DEFAULT 'Bambu Lab',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const countRes = await sql<{ count: string | number }>`SELECT count(*) as count FROM filaments`;
    const count = Number(countRes[0]?.count || 0);
    if (count === 0) {
      for (const f of DEFAULT_FILAMENTS) {
        await sql`
          INSERT INTO filaments (id, name, material_id, color_id, color_name, color_hex, spool_count, status, brand, notes)
          VALUES (${f.id}, ${f.name}, ${f.material_id}, ${f.color_id}, ${f.color_name}, ${f.color_hex}, ${f.spool_count}, ${f.status}, ${f.brand}, ${f.notes})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
  } catch (err) {
    console.error("[ensureFilamentsTable error]:", err);
  }
}

/**
 * Public: Get available in-stock filaments (excluding 'filament_over' / 0 spools)
 */
export const getAvailableFilaments = createServerFn({ method: "GET" }).handler(
  async (): Promise<FilamentRecord[]> => {
    try {
      const sql = await getSql();
      await ensureFilamentsTable(sql);

      const rows = await sql<FilamentRecord>`
        SELECT * FROM filaments 
        WHERE status != 'filament_over' AND spool_count > 0 
        ORDER BY material_id ASC, color_name ASC
      `;
      return rows;
    } catch (err) {
      console.error("[getAvailableFilaments error]:", err);
      return DEFAULT_FILAMENTS.filter((f) => f.status !== "filament_over");
    }
  }
);

/**
 * Admin: Get all filaments with internal spool counts and statuses
 */
export const getAllFilamentsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<FilamentRecord[]> => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensureFilamentsTable(sql);
    const rows = await sql<FilamentRecord>`
      SELECT * FROM filaments 
      ORDER BY material_id ASC, name ASC
    `;
    return rows;
  });

const filamentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  material_id: z.string().min(2),
  color_id: z.string().min(2),
  color_name: z.string().min(2),
  color_hex: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Valid hex color required"),
  spool_count: z.number().int().min(0, "Spool count cannot be negative"),
  status: z.enum(["in_stock", "low_stock", "filament_over"]),
  brand: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * Admin: Add new filament spool/color
 */
export const createFilament = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => filamentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensureFilamentsTable(sql);

    const id = `fil-${data.material_id}-${data.color_id}-${Math.random().toString(36).slice(2, 6)}`;

    await sql`
      INSERT INTO filaments (
        id, name, material_id, color_id, color_name, color_hex, spool_count, status, brand, notes
      ) VALUES (
        ${id}, ${data.name}, ${data.material_id}, ${data.color_id}, ${data.color_name}, 
        ${data.color_hex}, ${data.spool_count}, ${data.status}, ${data.brand || null}, ${data.notes || null}
      )
    `;

    return { success: true, id };
  });

/**
 * Admin: Update filament metadata and stock
 */
export const updateFilament = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (data: unknown) =>
      filamentSchema.extend({ id: z.string() }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`
      UPDATE filaments 
      SET 
        name = ${data.name},
        material_id = ${data.material_id},
        color_id = ${data.color_id},
        color_name = ${data.color_name},
        color_hex = ${data.color_hex},
        spool_count = ${data.spool_count},
        status = ${data.status},
        brand = ${data.brand || null},
        notes = ${data.notes || null},
        updated_at = now()
      WHERE id = ${data.id}
    `;

    return { success: true };
  });

/**
 * Admin: Quick status toggle (in_stock, low_stock, filament_over)
 */
export const updateFilamentStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string; status: FilamentStatus }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`
      UPDATE filaments 
      SET status = ${data.status}, updated_at = now() 
      WHERE id = ${data.id}
    `;

    return { success: true };
  });

/**
 * Admin: Quick spool count update (+1, -1, or direct number)
 */
export const updateFilamentSpools = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string; delta?: number; count?: number }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    if (data.count !== undefined) {
      const newCount = Math.max(0, data.count);
      const newStatus = newCount === 0 ? "filament_over" : newCount <= 1 ? "low_stock" : "in_stock";
      await sql`
        UPDATE filaments 
        SET spool_count = ${newCount}, status = ${newStatus}, updated_at = now() 
        WHERE id = ${data.id}
      `;
    } else if (data.delta !== undefined) {
      await sql`
        UPDATE filaments 
        SET 
          spool_count = GREATEST(0, spool_count + ${data.delta}),
          status = CASE 
            WHEN (spool_count + ${data.delta}) <= 0 THEN 'filament_over'
            WHEN (spool_count + ${data.delta}) = 1 THEN 'low_stock'
            ELSE 'in_stock'
          END,
          updated_at = now() 
        WHERE id = ${data.id}
      `;
    }

    return { success: true };
  });

/**
 * Admin: Delete filament from inventory
 */
export const deleteFilament = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`DELETE FROM filaments WHERE id = ${data.id}`;
    return { success: true };
  });
