import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware, optionalAuthMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";
import { z } from "zod";

/**
 * Waitlist server functions for interim selling phase (Item A5)
 * Captures email + interest with explicit unticked consent.
 */

export type WaitlistEntry = {
  id: string;
  email: string;
  interest: string;
  consent_at: string;
  consent_text: string;
  created_at: string;
  unsubscribed_at: string | null;
};

export const joinWaitlist = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator(
    z.object({
      email: z.string().email(),
      interest: z.string().min(1).default("launch"),
      consentText: z.string().min(5),
      hasConsent: z.boolean().refine((val) => val === true, {
        message: "You must agree to receive notification emails.",
      }),
      turnstileToken: z.string().optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanInterest = data.interest.trim().toLowerCase();

    // Check Cloudflare Turnstile token if secret is present
    const turnstileSecret =
      (typeof process !== "undefined" ? process.env.TURNSTILE_SECRET_KEY : undefined)?.trim() ||
      (globalThis as any).__env__?.TURNSTILE_SECRET_KEY?.trim();

    if (turnstileSecret && data.turnstileToken) {
      try {
        const verifyRes = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              secret: turnstileSecret,
              response: data.turnstileToken,
            }),
          },
        );
        const verifyData: any = await verifyRes.json();
        if (!verifyData.success) {
          throw new Error("Bot verification failed. Please try again.");
        }
      } catch (err: any) {
        if (err.message?.includes("Bot verification")) throw err;
        console.warn("[turnstile verify warning]:", err);
      }
    }

    // Insert or re-subscribe
    await sql`
      INSERT INTO waitlist (
        email, 
        interest, 
        consent_at, 
        consent_text, 
        unsubscribed_at
      )
      VALUES (
        ${cleanEmail}, 
        ${cleanInterest}, 
        NOW(), 
        ${data.consentText}, 
        NULL
      )
      ON CONFLICT (LOWER(email), interest) WHERE unsubscribed_at IS NULL
      DO UPDATE SET 
        consent_at = NOW(),
        consent_text = EXCLUDED.consent_text,
        unsubscribed_at = NULL
    `;

    return { success: true };
  });

export const unsubscribeWaitlist = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      interest: z.string().optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const cleanEmail = data.email.trim().toLowerCase();

    if (data.interest) {
      await sql`
        UPDATE waitlist 
        SET unsubscribed_at = NOW() 
        WHERE LOWER(email) = ${cleanEmail} AND interest = ${data.interest.toLowerCase().trim()}
      `;
    } else {
      await sql`
        UPDATE waitlist 
        SET unsubscribed_at = NOW() 
        WHERE LOWER(email) = ${cleanEmail}
      `;
    }

    return { success: true };
  });

export interface WaitlistStat {
  total: number;
  active: number;
  unsubscribed: number;
  interest: string;
  count_by_interest: number;
}

export const getWaitlistAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ entries: WaitlistEntry[]; stats: WaitlistStat[] }> => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const entries = await sql<WaitlistEntry>`
      SELECT * 
      FROM waitlist 
      ORDER BY created_at DESC
    `;

    const stats = await sql<WaitlistStat>`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN unsubscribed_at IS NULL THEN 1 END)::int as active,
        COUNT(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 END)::int as unsubscribed,
        interest,
        COUNT(*)::int as count_by_interest
      FROM waitlist
      GROUP BY interest
    `;

    return { entries, stats };
  });

export const deleteWaitlistEntryAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`DELETE FROM waitlist WHERE id = ${data.id}`;
    return { success: true };
  });
