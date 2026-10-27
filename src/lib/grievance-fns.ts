import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";
import { fetchSiteSettings } from "./settings-fns";
import { z } from "zod";

export type GrievanceComplaint = {
  id: string;
  ticket_number: string;
  name: string;
  email: string;
  phone?: string | null;
  order_number?: string | null;
  category: string;
  subject: string;
  description: string;
  status: "submitted" | "acknowledged" | "investigating" | "resolved" | "closed";
  acknowledge_due_at: string;
  acknowledged_at?: string | null;
  resolve_due_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  is_ack_overdue?: boolean;
  is_resolve_overdue?: boolean;
};

const GrievanceInputSchema = z.object({
  name: z.string().trim().min(2, "Full name is required (at least 2 characters)"),
  email: z.string().trim().email("Please provide a valid email address"),
  phone: z.string().trim().optional(),
  orderNumber: z.string().trim().optional(),
  category: z.enum([
    "product_defect",
    "delayed_delivery",
    "wrong_item",
    "damaged_in_transit",
    "refund_issue",
    "privacy_data",
    "data_deletion",
    "data_access",
    "consent_withdrawal",
    "customer_service",
    "other",
  ]),
  subject: z.string().trim().min(4, "Subject must be at least 4 characters"),
  description: z.string().trim().min(15, "Please describe your grievance in sufficient detail (at least 15 characters)"),
});

export type GrievanceInput = z.infer<typeof GrievanceInputSchema>;

/**
 * Core business logic: Process and persist a formal consumer grievance.
 * Generates an immutable tracking ticket, calculates statutory SLAs
 * (48-hour acknowledgement, 30-day resolution), and dispatches automated email.
 */
export async function processGrievanceSubmission(data: GrievanceInput) {
  const sql = await getSql();
  const settings = await fetchSiteSettings(sql);

  const year = new Date().getFullYear();
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const ticketNumber = `PRY-GRV-${year}-${randomSuffix}`;
  const id = `grv_${crypto.randomUUID()}`;

  // Statutory deadlines per Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020:
  // 1. Acknowledge receipt within 48 hours
  // 2. Redress/resolve within 1 month (30 days)
  const now = new Date();
  const ackDueDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const resolveDueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const safePhone = data.phone?.replace(/[^\d+]/g, "").slice(0, 15) || null;
  const safeOrderNum = data.orderNumber?.trim().toUpperCase().slice(0, 50) || null;

  await sql`
    INSERT INTO grievance_complaints (
      id, ticket_number, name, email, phone, order_number, 
      category, subject, description, status,
      acknowledge_due_at, resolve_due_at, created_at, updated_at
    ) VALUES (
      ${id}, ${ticketNumber}, ${data.name}, ${data.email}, ${safePhone}, ${safeOrderNum},
      ${data.category}, ${data.subject}, ${data.description}, 'submitted',
      ${ackDueDate.toISOString()}, ${resolveDueDate.toISOString()}, ${now.toISOString()}, ${now.toISOString()}
    )
  `;

  // Trigger immediate automated acknowledgement email inside SLA window
  import("./email.server")
    .then(({ sendGrievanceAcknowledgementEmail }) =>
      sendGrievanceAcknowledgementEmail({
        ticketNumber,
        email: data.email,
        name: data.name,
        subject: data.subject,
        category: data.category,
        orderNumber: safeOrderNum || undefined,
        grievanceOfficerName: settings.grievance_officer_name,
        grievanceOfficerEmail: settings.grievance_officer_email,
      })
    )
    .catch((err) => {
      console.error("[submitGrievanceComplaint] Email dispatch error:", err);
    });

  return {
    success: true,
    ticketNumber,
    acknowledgeDueAt: ackDueDate.toISOString(),
    resolveDueAt: resolveDueDate.toISOString(),
  };
}

/**
 * Public Server Function: Submit a formal consumer grievance.
 */
export const submitGrievanceComplaint = createServerFn({ method: "POST" })
  .validator(GrievanceInputSchema)
  .handler(async ({ data }) => {
    return processGrievanceSubmission(data);
  });

/**
 * Admin Server Function: Fetch all grievances with statutory SLA compliance flags.
 */
export const getAllGrievancesAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<GrievanceComplaint[]> => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const rows = await sql<GrievanceComplaint>`
      SELECT * FROM grievance_complaints
      ORDER BY created_at DESC
    `;

    const now = Date.now();
    return rows.map((row) => {
      const ackDue = new Date(row.acknowledge_due_at).getTime();
      const resolveDue = new Date(row.resolve_due_at).getTime();

      return {
        ...row,
        is_ack_overdue: !row.acknowledged_at && now > ackDue,
        is_resolve_overdue: row.status !== "resolved" && row.status !== "closed" && now > resolveDue,
      };
    });
  });

/**
 * Admin Server Function: Update status and resolution notes of a grievance ticket.
 */
export const updateGrievanceAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      ticketNumber: z.string(),
      status: z.enum(["submitted", "acknowledged", "investigating", "resolved", "closed"]),
      adminNotes: z.string().optional(),
      resolutionNotes: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const now = new Date().toISOString();

    const existing = await sql<GrievanceComplaint>`
      SELECT * FROM grievance_complaints WHERE ticket_number = ${data.ticketNumber} LIMIT 1
    `;
    if (!existing || existing.length === 0) {
      throw new Error("Grievance ticket not found");
    }

    const current = existing[0];
    const isNowAcknowledged = data.status !== "submitted" && !current.acknowledged_at;
    const isNowResolved = (data.status === "resolved" || data.status === "closed") && !current.resolved_at;

    await sql`
      UPDATE grievance_complaints
      SET status = ${data.status},
          admin_notes = COALESCE(${data.adminNotes || null}, admin_notes),
          resolution_notes = COALESCE(${data.resolutionNotes || null}, resolution_notes),
          acknowledged_at = CASE WHEN ${isNowAcknowledged} THEN ${now}::timestamptz ELSE acknowledged_at END,
          resolved_at = CASE WHEN ${isNowResolved} THEN ${now}::timestamptz ELSE resolved_at END,
          updated_at = ${now}::timestamptz
      WHERE ticket_number = ${data.ticketNumber}
    `;

    return { success: true };
  });
