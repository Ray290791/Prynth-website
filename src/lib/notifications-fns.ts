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
  hasWhatsappApiKey?: boolean;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  smsEnabled: boolean;
  smsProvider: "twilio" | "fast2sms";
  twilioSid: string;
  twilioToken: string;
  twilioFrom: string;
  hasTwilioCredentials?: boolean;
  fast2smsApiKey: string;
  hasFast2smsApiKey?: boolean;
  emailEnabled: boolean;
  adminEmail: string;
  notifyOnNewOrder: boolean;
  notifyOnFilamentOver: boolean;
  notifyOnLowStock: boolean;
  notifyOnInquiry: boolean;
}

/**
 * Admin: Get active notification channels and credentials
 * Raw secrets are redacted so they are never exposed in browser inspection
 */
export const getAdminNotificationSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<NotificationSettingsData> => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const cfg = await getNotificationConfig();
    return {
      ...cfg,
      hasFast2smsApiKey: Boolean(cfg.fast2smsApiKey && cfg.fast2smsApiKey.trim().length > 0),
      fast2smsApiKey: "", // Redact raw key so it is never exposed in client DOM or network responses
      hasTwilioCredentials: Boolean(cfg.twilioToken && cfg.twilioToken.trim().length > 0),
      twilioToken: "",
      hasWhatsappApiKey: Boolean(cfg.whatsappApiKey && cfg.whatsappApiKey.trim().length > 0),
      whatsappApiKey: "",
    };
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
      notify_telegram_enabled: String(Boolean(data.telegramEnabled)),
      notify_telegram_bot_token: data.telegramBotToken?.trim() || "",
      notify_telegram_chat_id: data.telegramChatId?.trim() || "",
      notify_sms_enabled: String(Boolean(data.smsEnabled)),
      notify_sms_provider: data.smsProvider || "fast2sms",
      notify_twilio_account_sid: data.twilioSid?.trim() || "",
      notify_twilio_from_phone: data.twilioFrom?.trim() || "PRYNTH",
      notify_email_enabled: String(Boolean(data.emailEnabled)),
      notify_email: data.adminEmail?.trim() || "",
      notify_on_new_order: String(Boolean(data.notifyOnNewOrder)),
      notify_on_filament_over: String(Boolean(data.notifyOnFilamentOver)),
      notify_on_low_stock: String(Boolean(data.notifyOnLowStock)),
      notify_on_inquiry: String(Boolean(data.notifyOnInquiry)),
    };

    // Only update sensitive keys if a new non-empty value was explicitly submitted
    if (data.fast2smsApiKey && data.fast2smsApiKey.trim().length > 0) {
      settingsMap.notify_fast2sms_apikey = data.fast2smsApiKey.trim();
    }
    if (data.twilioToken && data.twilioToken.trim().length > 0) {
      settingsMap.notify_twilio_auth_token = data.twilioToken.trim();
    }
    if (data.whatsappApiKey && data.whatsappApiKey.trim().length > 0) {
      settingsMap.notify_whatsapp_apikey = data.whatsappApiKey.trim();
    }

    const entries = Object.entries(settingsMap).map(([k, v]) => [k, String(v)]);
    if (entries.length > 0) {
      const placeholders = entries.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");
      const params = entries.flatMap(([k, v]) => [k, v]);
      await sql.query(
        `INSERT INTO site_settings (key, value)
         VALUES ${placeholders}
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        params
      );
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
  smsProvider: z.enum(["twilio", "fast2sms"]).optional().default("fast2sms"),
  twilioSid: z.string().optional().default(""),
  twilioToken: z.string().optional().default(""),
  twilioFrom: z.string().optional().default("PRYNTH"),
  fast2smsApiKey: z.string().optional().default(""),
  emailEnabled: z.boolean().optional().default(true),
  adminEmail: z.string().optional().default(""),
  notifyOnNewOrder: z.boolean().optional().default(true),
  notifyOnFilamentOver: z.boolean().optional().default(true),
  notifyOnLowStock: z.boolean().optional().default(true),
  notifyOnInquiry: z.boolean().optional().default(true),
});

let lastTestDispatchTime = 0;

/**
 * Admin: Trigger an immediate test notification to verify phone alerts
 * Rate-limited to 1 request per 10 seconds to protect wallet credits
 */
export const testAdminNotification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const now = Date.now();
    if (now - lastTestDispatchTime < 10000) {
      throw new Error("Please wait 10 seconds before sending another test alert to protect your SMS credits.");
    }

    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    lastTestDispatchTime = now;
    const results = await sendTestNotification();
    return { success: true, results };
  });
