import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import crypto from "crypto";
import { Resend } from "resend";

// Helper to check if a user is any admin
export async function verifyAdminRole(userId: string, sql: any) {
  const userRes = await sql`
    SELECT "user".email, admin_users.role 
    FROM "user" 
    JOIN admin_users ON LOWER(admin_users.email) = LOWER("user".email)
    WHERE "user".id = ${userId}
  `;
  if (!userRes.length) return null;
  return userRes[0] as { email: string; role: string };
}

// Helper to verify PIN
export async function verifyAdminPIN(email: string, pin: string, sql: any) {
  const res = await sql`SELECT pin_hash FROM admin_users WHERE LOWER(email) = LOWER(${email})`;
  if (!res.length || !res[0].pin_hash) return false;
  
  const [salt, hash] = res[0].pin_hash.split(':');
  const verifyHash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return verifyHash === hash;
}

export const getAdminTeam = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin || admin.role !== 'super_admin') {
      throw new Error("Unauthorized: Super Admin access required");
    }
    
    const res = await sql`SELECT email, role, created_at FROM admin_users ORDER BY created_at ASC`;
    return res as any[];
  });

export const addAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { email: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin || admin.role !== 'super_admin') {
      throw new Error("Unauthorized: Super Admin access required");
    }
    
    const targetEmail = data.email.toLowerCase().trim();
    if (!targetEmail) throw new Error("Email is required");

    await sql`
      INSERT INTO admin_users (email, role) 
      VALUES (${targetEmail}, 'admin')
      ON CONFLICT (email) DO NOTHING
    `;
    return { success: true };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { email: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin || admin.role !== 'super_admin') {
      throw new Error("Unauthorized: Super Admin access required");
    }
    
    const targetEmail = data.email.toLowerCase().trim();
    
    // Safety check
    const targetRes = await sql`SELECT role FROM admin_users WHERE LOWER(email) = ${targetEmail}`;
    if (targetRes.length > 0 && targetRes[0].role === 'super_admin') {
      throw new Error("Cannot remove a super admin");
    }

    await sql`DELETE FROM admin_users WHERE LOWER(email) = ${targetEmail}`;
    return { success: true };
  });

export const getAdminProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const res = await sql`SELECT pin_hash FROM admin_users WHERE LOWER(email) = LOWER(${admin.email})`;
    const hasPin = res.length > 0 && !!res[0].pin_hash;
    
    return {
      email: admin.email,
      role: admin.role,
      hasPin
    };
  });

export const setAdminPin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { pin: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    if (!/^\d{6}$/.test(data.pin)) {
      throw new Error("PIN must be exactly 6 digits");
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(data.pin, salt, 64).toString('hex');
    const pinHash = `${salt}:${hash}`;

    await sql`
      UPDATE admin_users 
      SET pin_hash = ${pinHash} 
      WHERE LOWER(email) = LOWER(${admin.email})
    `;
    return { success: true };
  });

export const requestPinResetOTP = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await sql`
      UPDATE admin_users 
      SET reset_otp = ${otp}, reset_otp_expires_at = ${expiresAt.toISOString()}
      WHERE LOWER(email) = LOWER(${admin.email})
    `;

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY || "re_mock");
    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: admin.email,
        subject: "Your Admin PIN Reset Code",
        html: `<p>Your 6-digit OTP code to reset your Admin PIN is: <strong>${otp}</strong></p><p>This code will expire in 15 minutes.</p>`
      });
    } catch (e) {
      console.error("Failed to send OTP email:", e);
    }

    return { success: true };
  });

export const resetAdminPinWithOTP = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { otp: string, newPin: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    if (!/^\d{6}$/.test(data.newPin)) {
      throw new Error("New PIN must be exactly 6 digits");
    }

    const res = await sql`
      SELECT reset_otp, reset_otp_expires_at 
      FROM admin_users 
      WHERE LOWER(email) = LOWER(${admin.email})
    `;
    
    if (!res.length || !res[0].reset_otp) {
      throw new Error("No OTP requested");
    }

    if (res[0].reset_otp !== data.otp) {
      throw new Error("Invalid OTP");
    }

    if (new Date() > new Date(res[0].reset_otp_expires_at as string)) {
      throw new Error("OTP has expired");
    }

    // Set new PIN
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(data.newPin, salt, 64).toString('hex');
    const pinHash = `${salt}:${hash}`;

    await sql`
      UPDATE admin_users 
      SET pin_hash = ${pinHash}, reset_otp = NULL, reset_otp_expires_at = NULL 
      WHERE LOWER(email) = LOWER(${admin.email})
    `;

    return { success: true };
  });
