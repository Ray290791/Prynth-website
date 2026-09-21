import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";

export type Address = {
  id: number;
  user_id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pin: string;
  is_default: boolean;
};

export type UserProfile = {
  user_id: string;
  phone: string | null;
  credits: number;
  referral_code: string | null;
  referred_by: string | null;
};

export const getUserProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    
    // Ensure profile exists
    const res = await sql<UserProfile>`SELECT * FROM user_profiles WHERE user_id = ${context.userId}`;
    if (res.length > 0) return res[0];

    // Create default profile if not exists
    const referralCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await sql`INSERT INTO user_profiles (user_id, referral_code) VALUES (${context.userId}, ${referralCode}) ON CONFLICT DO NOTHING`;
    
    const newRes = await sql<UserProfile>`SELECT * FROM user_profiles WHERE user_id = ${context.userId}`;
    return newRes[0];
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { phone?: string; name?: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    if (data.phone !== undefined) {
      await sql`UPDATE user_profiles SET phone = ${data.phone} WHERE user_id = ${context.userId}`;
    }
    if (data.name !== undefined) {
      await sql`UPDATE "user" SET name = ${data.name} WHERE id = ${context.userId}`;
    }
    return { success: true };
  });

export const getAddresses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return await sql<Address>`SELECT * FROM addresses WHERE user_id = ${context.userId} ORDER BY is_default DESC, created_at DESC`;
  });

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Omit<Address, "id" | "user_id" | "is_default"> & { is_default?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    if (data.is_default) {
      await sql`UPDATE addresses SET is_default = false WHERE user_id = ${context.userId}`;
    }
    const res = await sql`
      INSERT INTO addresses (user_id, name, phone, line1, line2, city, state, pin, is_default)
      VALUES (${context.userId}, ${data.name}, ${data.phone}, ${data.line1}, ${data.line2 || null}, ${data.city}, ${data.state}, ${data.pin}, ${data.is_default || false})
    `;
    return { success: true };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    await sql`DELETE FROM addresses WHERE id = ${id} AND user_id = ${context.userId}`;
    return { success: true };
  });

export const setDefaultAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    await sql`UPDATE addresses SET is_default = false WHERE user_id = ${context.userId}`;
    await sql`UPDATE addresses SET is_default = true WHERE id = ${id} AND user_id = ${context.userId}`;
    return { success: true };
  });
