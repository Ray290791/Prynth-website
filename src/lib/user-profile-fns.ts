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

import { z } from "zod";

const updateUserProfileSchema = z.object({
  phone: z.string().trim().max(20).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  image: z.string().max(2_800_000, "Image too large. Please use a photo under 2 MB.").optional(),
});

export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: z.infer<typeof updateUserProfileSchema>) => updateUserProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    if (data.phone !== undefined) {
      const sanitizedPhone = data.phone.replace(/[^\d+ -]/g, "").slice(0, 20);
      await sql`UPDATE user_profiles SET phone = ${sanitizedPhone} WHERE user_id = ${context.userId}`;
    }
    if (data.name !== undefined) {
      const sanitizedName = data.name.replace(/[\0<>]/g, "").slice(0, 100);
      await sql`UPDATE "user" SET name = ${sanitizedName} WHERE id = ${context.userId}`;
    }
    if (data.image !== undefined) {
      await sql`UPDATE "user" SET image = ${data.image} WHERE id = ${context.userId}`;
    }
    return { success: true };
  });

export const getAddresses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return await sql<Address>`SELECT * FROM addresses WHERE user_id = ${context.userId} ORDER BY is_default DESC, created_at DESC`;
  });

const saveAddressSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(10).max(20),
  line1: z.string().trim().min(3).max(150),
  line2: z.string().trim().max(150).nullable().optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pin: z.string().trim().min(4).max(10),
  is_default: z.boolean().optional(),
});

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: z.infer<typeof saveAddressSchema>) => saveAddressSchema.parse(data))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    if (data.is_default) {
      await sql`UPDATE addresses SET is_default = false WHERE user_id = ${context.userId}`;
    }
    const cleanName = data.name.replace(/[\0<>]/g, "");
    const cleanLine1 = data.line1.replace(/[\0<>]/g, "");
    const cleanLine2 = data.line2 ? data.line2.replace(/[\0<>]/g, "") : null;
    const cleanCity = data.city.replace(/[\0<>]/g, "");
    const cleanState = data.state.replace(/[\0<>]/g, "");
    const cleanPin = data.pin.replace(/[^\w]/g, "");

    await sql`
      INSERT INTO addresses (user_id, name, phone, line1, line2, city, state, pin, is_default)
      VALUES (${context.userId}, ${cleanName}, ${data.phone}, ${cleanLine1}, ${cleanLine2}, ${cleanCity}, ${cleanState}, ${cleanPin}, ${data.is_default || false})
    `;
    return { success: true };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    await sql`DELETE FROM addresses WHERE id = ${id} AND user_id = ${context.userId}`;
    return { success: true };
  });

export const setDefaultAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ data: id, context }) => {
    const sql = await getSql();
    await sql`UPDATE addresses SET is_default = false WHERE user_id = ${context.userId}`;
    await sql`UPDATE addresses SET is_default = true WHERE id = ${id} AND user_id = ${context.userId}`;
    return { success: true };
  });

