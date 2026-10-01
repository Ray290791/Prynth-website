import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";

// In-memory rate limiting map: email -> timestamps[]
const submissionTimestamps = new Map<string, number[]>();

function checkRateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  if (submissionTimestamps.size > 2000) {
    for (const [k, times] of submissionTimestamps.entries()) {
      const active = times.filter((t) => now - t < windowMs);
      if (active.length === 0) {
        submissionTimestamps.delete(k);
      } else {
        submissionTimestamps.set(k, active);
      }
    }
  }
  const times = (submissionTimestamps.get(key) || []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    return false;
  }
  times.push(now);
  submissionTimestamps.set(key, times);
  return true;
}

export const submitContactMessage = createServerFn({ method: "POST" })
  .validator((data: { name: string; email: string; message: string }) => {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const message = data.message?.trim();

    if (!name || name.length > 100) {
      throw new Error("Name must be between 1 and 100 characters.");
    }
    if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address (max 150 characters).");
    }
    if (!message || message.length > 3000) {
      throw new Error("Message must be between 1 and 3,000 characters.");
    }

    return { name, email, message };
  })
  .handler(async ({ data }) => {
    // Rate limit per email: max 5 messages per 10 minutes
    if (!checkRateLimit(data.email)) {
      throw new Error("Too many messages submitted. Please wait a few minutes before trying again.");
    }

    const sql = await getSql();
    const userId = "guest-" + data.email;

    await sql`
      INSERT INTO tickets (user_id, title, description, status)
      VALUES (${userId}, ${`Contact from ${data.name}`}, ${data.message}, 'open')
    `;

    const { sendContactFormEmail } = await import("./email.server");
    await sendContactFormEmail(data.name, data.email, data.message);

    try {
      const { notifyNewInquiry } = await import("./notifications.server");
      await notifyNewInquiry({
        name: data.name,
        email: data.email,
        message: data.message,
      });
    } catch (err) {
      console.error("Failed to send phone notification for inquiry:", err);
    }

    return { success: true };
  });

import { authMiddleware, optionalAuthMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";

export interface Ticket {
  id: number;
  user_id: string;
  title: string;
  description: string;
  status: "open" | "resolved" | "closed";
  created_at: string;
}

export interface CustomDesignRequestInput {
  name?: string;
  email: string;
  phone?: string;
  idea: string;
  photos?: string[];
  sizeName?: string;
  materialName?: string;
  colorName?: string;
  quantity?: number;
  printerName?: string;
  specsSummary?: string;
}

export const submitCustomDesignRequest = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((data: CustomDesignRequestInput) => {
    const email = data.email?.trim().toLowerCase();
    const idea = data.idea?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address so we can reply with your quote.");
    }
    if ((!idea || idea.length < 5) && (!data.photos || data.photos.length === 0)) {
      throw new Error("Please describe what you need or attach at least one reference photo.");
    }
    return {
      ...data,
      email,
      name: data.name?.trim() || "Customer",
      idea: idea || "Custom 3D model request (see attached photos)",
    };
  })
  .handler(async ({ data, context }) => {
    if (!checkRateLimit(data.email, 6, 10 * 60 * 1000)) {
      throw new Error("Too many requests submitted. Please wait a few minutes before trying again.");
    }

    const sql = await getSql();
    const userId = context.userId || `guest-${data.email}`;

    const ticketPayload = {
      isCustomRequest: true,
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone || "",
      idea: data.idea,
      sizeName: data.sizeName || "Standard",
      materialName: data.materialName || "PLA",
      colorName: data.colorName || "Standard",
      quantity: data.quantity || 1,
      printerName: data.printerName || "Bambu Lab Fleet",
      specsSummary: data.specsSummary || "",
      photos: (data.photos || []).slice(0, 5),
    };

    const formattedDescription = JSON.stringify(ticketPayload);

    const [inserted] = await sql<{ id: number }>`
      INSERT INTO tickets (user_id, title, description, status)
      VALUES (
        ${userId},
        ${`Custom 3D Request from ${data.name || data.email}`},
        ${formattedDescription},
        'open'
      )
      RETURNING id
    `;

    try {
      const { sendCustomRequestAdminEmail, sendCustomRequestCustomerAckEmail } = await import("./email.server");
      await sendCustomRequestAdminEmail({
        ticketId: inserted.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        idea: data.idea,
        sizeName: data.sizeName,
        materialName: data.materialName,
        colorName: data.colorName,
        quantity: data.quantity || 1,
        printerName: data.printerName,
        photosCount: (data.photos || []).length,
      });

      await sendCustomRequestCustomerAckEmail({
        ticketId: inserted.id,
        name: data.name,
        email: data.email,
        idea: data.idea,
        materialName: data.materialName,
        photosCount: (data.photos || []).length,
      });
    } catch (err) {
      console.error("Failed to send custom request emails:", err);
    }

    try {
      const { notifyNewInquiry } = await import("./notifications.server");
      await notifyNewInquiry({
        name: data.name,
        email: data.email,
        message: `Custom 3D Print Request (#${inserted.id}): ${data.idea.slice(0, 100)}... (${(data.photos || []).length} photos attached)`,
      });
    } catch (err) {
      console.error("Failed to send phone notification for custom request:", err);
    }

    return { success: true, ticketId: inserted.id };
  });

export const getUserTickets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const tickets = await sql<Ticket>`
      SELECT id, user_id, title, description, status, created_at
      FROM tickets
      WHERE user_id = ${context.userId}
      ORDER BY created_at DESC
    `;
    return tickets;
  });

export const getTicketsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const tickets = await sql<Ticket>`
      SELECT id, user_id, title, description, status, created_at
      FROM tickets
      ORDER BY created_at DESC
    `;
    return tickets;
  });

export const updateTicketStatusAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number; status: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }

    await sql`
      UPDATE tickets
      SET status = ${data.status}
      WHERE id = ${data.id}
    `;
    return { success: true };
  });

export const deleteTicketAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }

    await sql`
      DELETE FROM tickets
      WHERE id = ${data.id}
    `;
    return { success: true };
  });

export const replyToTicketAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: number; toEmail: string; customerName: string; originalMessage: string; replyMessage: string; markResolved?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }

    if (!data.replyMessage.trim()) {
      throw new Error("Reply message cannot be empty.");
    }

    const { sendTicketReplyEmail } = await import("./email.server");
    await sendTicketReplyEmail(data.customerName, data.toEmail, data.originalMessage, data.replyMessage);

    if (data.markResolved !== false) {
      await sql`
        UPDATE tickets
        SET status = 'resolved'
        WHERE id = ${data.id}
      `;
    }

    return { success: true };
  });

