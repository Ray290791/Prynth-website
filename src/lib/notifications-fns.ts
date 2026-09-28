import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";
import { z } from "zod";
import {
  getNotificationConfig,
  sendTestNotification,
} from "./notifications.server";

export interface NotificationSettingsData {
  phoneNumber: string;
  whatsappEnabled: boolean;
  whatsappProvider: "callmebot" | "twilio";
  whatsappApiKey: string;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  smsEnabled: boolean;
  twilioSid: string;
  twilioToken: string;
  twilioFrom: string;
  emailEnabled: boolean;
  adminEmail: string;
  notifyOnNewOrder: boolean;
  notifyOnFilamentOver: boolean;
  notifyOnLowStock: boolean;
  notifyOnInquiry: boolean;
}

/**
 * Admin: Get active notification channels and credentials
 */
export const getAdminNotificationSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<NotificationSettingsData> => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    return await getNotificationConfig();
  });

/**
 * Admin: Save notification channels and preferences
 */
export const updateAdminNotificationSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: z.infer<typeof notificationSchema>) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const settingsMap: Record<string, string> = {
      notify_phone_number: data.phoneNumber?.trim() || "",
      notify_whatsapp_enabled: String(Boolean(data.whatsappEnabled)),
      notify_whatsapp_provider: data.whatsappProvider || "callmebot",
      notify_whatsapp_apikey: data.whatsappApiKey?.trim() || "",
      notify_telegram_enabled: String(Boolean(data.telegramEnabled)),
      notify_telegram_bot_token: data.telegramBotToken?.trim() || "",
      notify_telegram_chat_id: data.telegramChatId?.trim() || "",
      notify_sms_enabled: String(Boolean(data.smsEnabled)),
      notify_twilio_account_sid: data.twilioSid?.trim() || "",
      notify_twilio_auth_token: data.twilioToken?.trim() || "",
      notify_twilio_from_phone: data.twilioFrom?.trim() || "",
      notify_email_enabled: String(Boolean(data.emailEnabled)),
      notify_email: data.adminEmail?.trim() || "",
      notify_on_new_order: String(Boolean(data.notifyOnNewOrder)),
      notify_on_filament_over: String(Boolean(data.notifyOnFilamentOver)),
      notify_on_low_stock: String(Boolean(data.notifyOnLowStock)),
      notify_on_inquiry: String(Boolean(data.notifyOnInquiry)),
    };

    for (const [key, val] of Object.entries(settingsMap)) {
      await sql`
        INSERT INTO site_settings (key, value)
        VALUES (${key}, ${val})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
    }

    return { success: true };
  });

const notificationSchema = z.object({
  phoneNumber: z.string().optional().default(""),
  whatsappEnabled: z.boolean().optional().default(false),
  whatsappProvider: z.enum(["callmebot", "twilio"]).optional().default("callmebot"),
  whatsappApiKey: z.string().optional().default(""),
  telegramEnabled: z.boolean().optional().default(false),
  telegramBotToken: z.string().optional().default(""),
  telegramChatId: z.string().optional().default(""),
  smsEnabled: z.boolean().optional().default(false),
  twilioSid: z.string().optional().default(""),
  twilioToken: z.string().optional().default(""),
  twilioFrom: z.string().optional().default(""),
  emailEnabled: z.boolean().optional().default(true),
  adminEmail: z.string().optional().default(""),
  notifyOnNewOrder: z.boolean().optional().default(true),
  notifyOnFilamentOver: z.boolean().optional().default(true),
  notifyOnLowStock: z.boolean().optional().default(true),
  notifyOnInquiry: z.boolean().optional().default(true),
});

/**
 * Admin: Trigger an immediate test notification to verify phone alerts
 */
export const testAdminNotification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const results = await sendTestNotification();
    return { success: true, results };
  });
