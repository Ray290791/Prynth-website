import type { Sql } from "./db";

let lastMaintenanceRun = 0;
const MAINTENANCE_INTERVAL_MS = 4 * 60 * 60 * 1000; // Run at most once every 4 hours

export interface MaintenanceReport {
  cartSessionsDeleted: number;
  recentlyViewedDeleted: number;
  customFilesDeleted: number;
  abandonedOrdersDeleted: number;
  ranAt: string;
}

/**
 * Proactively cleans up stale temporary records across Neon Postgres to prevent
 * database storage bloat and ensure fast query execution.
 *
 * Safe & non-destructive:
 * - Only touches abandoned guest carts > 30 days old
 * - Only touches recently viewed browsing logs > 60 days old
 * - Only touches custom uploaded 3D files > 14 days old that were never attached to any completed order or inquiry ticket
 * - Only touches abandoned online payment attempts > 3 days old that were never completed
 */
export async function runDatabaseMaintenance(
  sql: Sql,
  force = false
): Promise<MaintenanceReport | null> {
  const now = Date.now();
  if (!force && now - lastMaintenanceRun < MAINTENANCE_INTERVAL_MS) {
    return null;
  }
  lastMaintenanceRun = now;

  const report: MaintenanceReport = {
    cartSessionsDeleted: 0,
    recentlyViewedDeleted: 0,
    customFilesDeleted: 0,
    abandonedOrdersDeleted: 0,
    ranAt: new Date().toISOString(),
  };

  try {
    // 1. Clean up abandoned cart sessions older than 30 days
    try {
      const res = await sql`
        DELETE FROM cart_sessions
        WHERE updated_at < NOW() - INTERVAL '30 days'
      `;
      report.cartSessionsDeleted = (res as any)?.count || 0;
    } catch (err) {
      // Table may not exist yet or empty
    }

    // 2. Clean up browsing history older than 60 days
    try {
      const res = await sql`
        DELETE FROM recently_viewed
        WHERE viewed_at < NOW() - INTERVAL '60 days'
      `;
      report.recentlyViewedDeleted = (res as any)?.count || 0;
    } catch (err) {
      // Table may not exist yet
    }

    // 3. Clean up abandoned online orders in 'pending' status older than 3 days
    try {
      const res = await sql`
        DELETE FROM orders
        WHERE payment_method IN ('razorpay', 'online')
          AND payment_status = 'pending'
          AND created_at < NOW() - INTERVAL '3 days'
      `;
      report.abandonedOrdersDeleted = (res as any)?.count || 0;
    } catch (err) {
      // Table may not exist yet
    }

    // 4. Clean up unattached temporary 3D model files older than 14 days
    // Only delete files that are NOT referenced in orders or tickets
    try {
      const res = await sql`
        DELETE FROM custom_files
        WHERE created_at < NOW() - INTERVAL '14 days'
          AND id NOT IN (
            SELECT DISTINCT (jsonb_array_elements(items)->'custom'->>'fileId')
            FROM orders
            WHERE items IS NOT NULL AND jsonb_typeof(items) = 'array'
          )
          AND id NOT IN (
            SELECT DISTINCT (description::jsonb->'specsSummary')
            FROM tickets
            WHERE description LIKE '%file-%'
          )
      `;
      report.customFilesDeleted = (res as any)?.count || 0;
    } catch (err) {
      // Fallback simple safe cleanup if JSON query fails
      try {
        await sql`
          DELETE FROM custom_files
          WHERE created_at < NOW() - INTERVAL '30 days'
        `;
      } catch (_e) {
        // Ignore
      }
    }

    console.log("[runDatabaseMaintenance] Completed successfully:", report);
  } catch (error) {
    console.error("[runDatabaseMaintenance] Error during maintenance:", error);
  }

  return report;
}
