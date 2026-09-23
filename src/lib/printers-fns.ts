import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";
import { z } from "zod";

export type PrinterStatus = "available" | "busy" | "maintenance" | "offline";

export interface Printer {
  id: string;
  name: string;
  model: string;
  status: PrinterStatus;
  build_volume: string;
  nozzle_size: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_PRINTERS: Printer[] = [
  {
    id: "p1s-01",
    name: "Bambu Lab P1S #1",
    model: "Bambu Lab P1S",
    status: "available",
    build_volume: "256 × 256 × 256 mm",
    nozzle_size: "0.4 mm Hardened Steel",
    description: "Primary high-speed enclosed CoreXY workhorse. Handles PLA, PETG, TPU, ABS.",
    order_index: 1,
    is_active: true,
  },
  {
    id: "p1s-02",
    name: "Bambu Lab P1S #2 (AMS)",
    model: "Bambu Lab P1S",
    status: "available",
    build_volume: "256 × 256 × 256 mm",
    nozzle_size: "0.4 mm Hardened Steel",
    description: "Secondary workhorse equipped with 4-spool AMS automatic material system.",
    order_index: 2,
    is_active: true,
  },
  {
    id: "a1-mini-01",
    name: "Bambu Lab A1 Mini",
    model: "Bambu Lab A1 Mini",
    status: "available",
    build_volume: "180 × 180 × 180 mm",
    nozzle_size: "0.4 mm Stainless Steel",
    description: "Ultra-fast compact bed-slinger for rapid detailed miniatures & prototypes.",
    order_index: 3,
    is_active: true,
  },
  {
    id: "x1c-01",
    name: "Bambu Lab X1-Carbon",
    model: "Bambu Lab X1-Carbon",
    status: "available",
    build_volume: "256 × 256 × 256 mm",
    nozzle_size: "0.4 mm Hardened Steel",
    description: "Flagship engineering printer with micro-lidar first layer inspection.",
    order_index: 4,
    is_active: true,
  },
];

async function ensurePrintersTable(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS printers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        model TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        build_volume TEXT NOT NULL DEFAULT '256 × 256 × 256 mm',
        nozzle_size TEXT NOT NULL DEFAULT '0.4 mm',
        description TEXT,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const countRes = await sql<{ count: string | number }>`SELECT count(*) as count FROM printers`;
    const count = Number(countRes[0]?.count || 0);
    if (count === 0) {
      for (const p of DEFAULT_PRINTERS) {
        await sql`
          INSERT INTO printers (id, name, model, status, build_volume, nozzle_size, description, order_index, is_active)
          VALUES (${p.id}, ${p.name}, ${p.model}, ${p.status}, ${p.build_volume}, ${p.nozzle_size}, ${p.description}, ${p.order_index}, ${p.is_active})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
  } catch (err) {
    console.error("[ensurePrintersTable error]:", err);
  }
}

export const getPrinters = createServerFn({ method: "GET" }).handler(
  async (): Promise<Printer[]> => {
    try {
      const sql = await getSql();
      await ensurePrintersTable(sql);
      const rows = await sql<Printer>`
        SELECT * FROM printers
        WHERE is_active = true
        ORDER BY order_index ASC, created_at ASC
      `;
      if (rows && rows.length > 0) return rows;
      return DEFAULT_PRINTERS;
    } catch (err) {
      console.error("[getPrinters error, returning defaults]:", err);
      return DEFAULT_PRINTERS;
    }
  }
);

export const getAllPrintersAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Printer[]> => {
    if (!context.userId) throw new Error("Unauthorized");
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensurePrintersTable(sql);
    const rows = await sql<Printer>`
      SELECT * FROM printers
      ORDER BY order_index ASC, created_at ASC
    `;
    return rows;
  });

export const updatePrinterStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      status: z.enum(["available", "busy", "maintenance", "offline"]),
    })
  )
  .handler(async ({ context, data }) => {
    if (!context.userId) throw new Error("Unauthorized");
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensurePrintersTable(sql);
    await sql`
      UPDATE printers
      SET status = ${data.status}, updated_at = now()
      WHERE id = ${data.id}
    `;
    return { success: true };
  });

export const createPrinter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().min(1),
      model: z.string().min(1),
      status: z.enum(["available", "busy", "maintenance", "offline"]).default("available"),
      build_volume: z.string().default("256 × 256 × 256 mm"),
      nozzle_size: z.string().default("0.4 mm"),
      description: z.string().optional(),
      order_index: z.number().default(0),
      is_active: z.boolean().default(true),
    })
  )
  .handler(async ({ context, data }) => {
    if (!context.userId) throw new Error("Unauthorized");
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensurePrintersTable(sql);
    const id = `ptr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO printers (id, name, model, status, build_volume, nozzle_size, description, order_index, is_active)
      VALUES (${id}, ${data.name}, ${data.model}, ${data.status}, ${data.build_volume}, ${data.nozzle_size}, ${data.description || null}, ${data.order_index}, ${data.is_active})
    `;
    return { success: true, id };
  });

export const updatePrinter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      model: z.string().min(1),
      status: z.enum(["available", "busy", "maintenance", "offline"]),
      build_volume: z.string(),
      nozzle_size: z.string(),
      description: z.string().optional().nullable(),
      order_index: z.number().default(0),
      is_active: z.boolean().default(true),
    })
  )
  .handler(async ({ context, data }) => {
    if (!context.userId) throw new Error("Unauthorized");
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensurePrintersTable(sql);
    await sql`
      UPDATE printers
      SET name = ${data.name},
          model = ${data.model},
          status = ${data.status},
          build_volume = ${data.build_volume},
          nozzle_size = ${data.nozzle_size},
          description = ${data.description || null},
          order_index = ${data.order_index},
          is_active = ${data.is_active},
          updated_at = now()
      WHERE id = ${data.id}
    `;
    return { success: true };
  });

export const deletePrinter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    if (!context.userId) throw new Error("Unauthorized");
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensurePrintersTable(sql);
    await sql`DELETE FROM printers WHERE id = ${data.id}`;
    return { success: true };
  });
