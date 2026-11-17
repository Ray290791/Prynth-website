import { getSql } from "./db";
import { Resend } from "resend";
import { getSenderEmail } from "./email.server";

interface NotificationConfig {
  phoneNumber: string;
  whatsappEnabled: boolean;
  whatsappProvider: "twilio" | "callmebot";
  whatsappApiKey: string;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  smsEnabled: boolean;
  smsProvider: "twilio" | "fast2sms";
  twilioSid: string;
  twilioToken: string;
  twilioFrom: string;
  fast2smsApiKey: string;
  emailEnabled: boolean;
  adminEmail: string;
  adminEmails: string[];
  notifyOnNewOrder: boolean;
  notifyOnFilamentOver: boolean;
  notifyOnLowStock: boolean;
  notifyOnInquiry: boolean;
}

/**
 * Load notification configurations from database site_settings and environment variables
 */
export async function getNotificationConfig(): Promise<NotificationConfig> {
  const sql = await getSql();
  const dbSettings: Record<string, string> = {};
  try {
    const rows = await sql<{ key: string; value: string }>`
      SELECT key, value FROM site_settings 
      WHERE key LIKE 'notify_%'
    `;
    for (const r of rows) {
      dbSettings[r.key] = r.value;
    }
  } catch (err) {
    console.error("Failed to read notification settings from database:", err);
  }

  const env = process.env;

  const { getAllAdminEmails } = await import("./admin-fns");
  const adminEmails = await getAllAdminEmails(sql);

  return {
    phoneNumber: dbSettings.notify_phone_number || env.NOTIFY_PHONE_NUMBER || "+918369485272",
    whatsappEnabled: (dbSettings.notify_whatsapp_enabled ?? env.NOTIFY_WHATSAPP_ENABLED) === "true",
    whatsappProvider: (dbSettings.notify_whatsapp_provider || env.NOTIFY_WHATSAPP_PROVIDER || "twilio") as "twilio" | "callmebot",
    whatsappApiKey: dbSettings.notify_whatsapp_apikey || env.NOTIFY_WHATSAPP_APIKEY || "",
    telegramEnabled: (dbSettings.notify_telegram_enabled ?? env.NOTIFY_TELEGRAM_ENABLED) === "true",
    telegramBotToken: dbSettings.notify_telegram_bot_token || env.NOTIFY_TELEGRAM_BOT_TOKEN || "",
    telegramChatId: dbSettings.notify_telegram_chat_id || env.NOTIFY_TELEGRAM_CHAT_ID || "",
    smsEnabled: (dbSettings.notify_sms_enabled ?? env.NOTIFY_SMS_ENABLED) === "true",
    smsProvider: (dbSettings.notify_sms_provider || env.NOTIFY_SMS_PROVIDER || "fast2sms") as "twilio" | "fast2sms",
    twilioSid: dbSettings.notify_twilio_account_sid || env.TWILIO_ACCOUNT_SID || "",
    twilioToken: dbSettings.notify_twilio_auth_token || env.TWILIO_AUTH_TOKEN || "",
    twilioFrom: dbSettings.notify_twilio_from_phone || env.TWILIO_FROM_PHONE || "PRYNTH",
    fast2smsApiKey: dbSettings.notify_fast2sms_apikey || env.FAST2SMS_API_KEY || "",
    emailEnabled: (dbSettings.notify_email_enabled ?? "true") !== "false",
    adminEmail: dbSettings.notify_email || env.ADMIN_EMAIL || adminEmails[0] || "prynth07@gmail.com",
    adminEmails,
    notifyOnNewOrder: (dbSettings.notify_on_new_order ?? "true") !== "false",
    notifyOnFilamentOver: (dbSettings.notify_on_filament_over ?? "true") !== "false",
    notifyOnLowStock: (dbSettings.notify_on_low_stock ?? "true") !== "false",
    notifyOnInquiry: (dbSettings.notify_on_inquiry ?? "true") !== "false",
  };
}

/**
 * Dispatch message across all active notification channels (WhatsApp, Telegram, SMS, Email)
 */
export async function dispatchNotification({
  plainText,
  formattedHtml,
  subject,
}: {
  plainText: string;
  formattedHtml: string;
  subject: string;
}) {
  const config = await getNotificationConfig();
  const results: { channel: string; success: boolean; error?: string }[] = [];

  // 1. WhatsApp Notification
  if (config.whatsappEnabled && config.phoneNumber) {
    try {
      if (config.whatsappProvider === "callmebot" && config.whatsappApiKey) {
        // Clean phone: remove spaces, dashes, parentheses and leading '+'
        const cleanPhone = config.phoneNumber.replace(/[\s()+-]/g, "");
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(plainText)}&apikey=${encodeURIComponent(config.whatsappApiKey)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`CallMeBot HTTP ${res.status}: ${await res.text()}`);
        }
        results.push({ channel: "whatsapp", success: true });
      } else if (config.whatsappProvider === "twilio" && config.twilioSid && config.twilioToken && config.twilioFrom) {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`;
        const toPhone = config.phoneNumber.startsWith("whatsapp:") ? config.phoneNumber : `whatsapp:${config.phoneNumber}`;
        const fromPhone = config.twilioFrom.startsWith("whatsapp:") ? config.twilioFrom : `whatsapp:${config.twilioFrom}`;

        const params = new URLSearchParams({
          From: fromPhone,
          To: toPhone,
          Body: plainText,
        });

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.twilioSid}:${config.twilioToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (!res.ok) {
          throw new Error(`Twilio WhatsApp HTTP ${res.status}: ${await res.text()}`);
        }
        results.push({ channel: "whatsapp", success: true });
      } else {
        results.push({ channel: "whatsapp", success: false, error: "Missing WhatsApp credentials or phone number" });
      }
    } catch (err: any) {
      console.error("WhatsApp notification error:", err);
      results.push({ channel: "whatsapp", success: false, error: err?.message || String(err) });
    }
  }

  // 2. Telegram Notification (Instant Free Push Alert)
  if (config.telegramEnabled && config.telegramBotToken && config.telegramChatId) {
    try {
      const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.telegramChatId,
          text: formattedHtml,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.description || "Telegram API failed");
      }
      results.push({ channel: "telegram", success: true });
    } catch (err: any) {
      console.error("Telegram notification error:", err);
      results.push({ channel: "telegram", success: false, error: err?.message || String(err) });
    }
  }

  // 3. SMS Notification (Directly from PRYNTH via Twilio or Fast2SMS)
  if (config.smsEnabled && config.phoneNumber) {
    if (config.smsProvider === "fast2sms" && config.fast2smsApiKey) {
      try {
        const cleanPhone = config.phoneNumber.replace(/\D/g, "").slice(-10);
        // Strip emojis and Unicode characters to avoid the 70-character UCS-2 limit, and clamp strictly to 150 chars (1 SMS credit)
        const cleanAscii = plainText
          .replace(/[^\x20-\x7E\n]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const smsMessage = cleanAscii.length > 150 ? cleanAscii.slice(0, 147) + "..." : cleanAscii;

        const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: config.fast2smsApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "q",
            message: smsMessage,
            language: "english",
            flash: 0,
            numbers: cleanPhone,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data && data.return === false)) {
          throw new Error(data?.message || `Fast2SMS HTTP ${res.status}`);
        }
        results.push({ channel: "sms", success: true });
      } catch (err: any) {
        console.error("Fast2SMS error:", err);
        results.push({ channel: "sms", success: false, error: err?.message || String(err) });
      }
    } else if (config.twilioSid && config.twilioToken && config.twilioFrom) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`;
        const senderFrom = config.twilioFrom.replace("whatsapp:", "").trim() || "PRYNTH";
        const params = new URLSearchParams({
          From: senderFrom,
          To: config.phoneNumber.replace("whatsapp:", ""),
          Body: plainText,
        });

        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.twilioSid}:${config.twilioToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (!res.ok) {
          throw new Error(`Twilio SMS HTTP ${res.status}: ${await res.text()}`);
        }
        results.push({ channel: "sms", success: true });
      } catch (err: any) {
        console.error("SMS notification error:", err);
        results.push({ channel: "sms", success: false, error: err?.message || String(err) });
      }
    } else {
      results.push({ channel: "sms", success: false, error: "Missing SMS credentials (Twilio or Fast2SMS)" });
    }
  }

  // 4. Resend High-Priority Admin Email Notification (Sent to all admins in the Admin Team)
  if (config.emailEnabled && (config.adminEmails?.length > 0 || config.adminEmail)) {
    try {
      const { getResend } = await import("./email.server");
      const resend = await getResend();
      if (resend) {
        const fromEmail = await getSenderEmail();
        const recipients = config.adminEmails?.length > 0 ? config.adminEmails : [config.adminEmail];
        await resend.emails.send({
          from: fromEmail,
          to: recipients,
          subject: `[Prynth Alert] ${subject}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1e2124; line-height: 1.5;">
              <div style="background-color: #00b8a9; padding: 20px; border-radius: 12px 12px 0 0; color: #fff;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 700;">🔔 Prynth Store Notification</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 12px 12px; background-color: #ffffff;">
                <div style="font-size: 15px; margin-bottom: 20px; white-space: pre-wrap;">${formattedHtml}</div>
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f4f4f5; text-align: center;">
                  <a href="https://prynth.in/admin" style="display: inline-block; background-color: #00b8a9; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Admin Dashboard</a>
                </div>
              </div>
            </div>
          `,
        });
        results.push({ channel: "email", success: true });
      }
    } catch (err: any) {
      console.error("Email alert error:", err);
      results.push({ channel: "email", success: false, error: err?.message || String(err) });
    }
  }

  return results;
}

/**
 * Trigger alert when a new order is received
 */
export async function notifyNewOrder(orderData: {
  orderNumber: string;
  name: string;
  email: string;
  phone?: string;
  total: number;
  paymentMethod: string;
  items: Array<{ name: string; qty: number; color?: string; size?: string; custom?: any }>;
  shippingAddress?: string;
}) {
  const config = await getNotificationConfig();
  if (!config.notifyOnNewOrder) return;

  const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const itemList = orderData.items
    .map((item) => {
      const details = [
        item.color,
        item.size,
        item.custom?.printerName,
        item.custom?.quality,
        item.custom?.infillPercentage ? `${item.custom.infillPercentage}% infill` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return `• ${item.qty}x ${item.name}${details ? ` (${details})` : ""}`;
    })
    .join("\n");

  const plainText =
    `🛒 NEW ORDER: #${orderData.orderNumber}
Amount: ${formatINR(orderData.total)} (${orderData.paymentMethod.toUpperCase()})
Customer: ${orderData.name} ${orderData.phone ? `(${orderData.phone})` : ""}
Email: ${orderData.email}

Items:
${itemList}

Manage order: https://prynth.in/admin`;

  const formattedHtml =
    `<b>🛒 NEW ORDER: #${orderData.orderNumber}</b>
<b>Total:</b> ${formatINR(orderData.total)} (${orderData.paymentMethod.toUpperCase()})
<b>Customer:</b> ${orderData.name} ${orderData.phone ? `(${orderData.phone})` : ""}
<b>Email:</b> ${orderData.email}

<b>Items:</b>
<pre>${itemList}</pre>

<a href="https://prynth.in/admin">👉 Open Admin to View Details</a>`;

  return await dispatchNotification({
    plainText,
    formattedHtml,
    subject: `New Order #${orderData.orderNumber} (${formatINR(orderData.total)})`,
  });
}

/**
 * Trigger alert when a filament spool is depleted ("filament_over" or 0 count)
 */
export async function notifyFilamentOver(filament: {
  name: string;
  material: string;
  colorName: string;
  brand?: string | null;
}) {
  const config = await getNotificationConfig();
  if (!config.notifyOnFilamentOver) return;

  const brandStr = filament.brand ? `${filament.brand} ` : "";
  const plainText =
    `🔴 FILAMENT OVER ALERT!
Spool empty: ${filament.name}
Material: ${brandStr}${filament.material.toUpperCase()}
Color: ${filament.colorName}

⚠️ This spool has 0 stock and is now marked 'Filament Over'. It has been hidden from custom 3D print selections.

Restock inventory: https://prynth.in/admin`;

  const formattedHtml =
    `<b>🔴 FILAMENT OVER ALERT!</b>
Spool empty: <b>${filament.name}</b>
<b>Material:</b> ${brandStr}${filament.material.toUpperCase()}
<b>Color:</b> ${filament.colorName}

⚠️ <i>This spool has 0 stock and is now marked 'Filament Over'. It has been hidden from custom 3D print selections.</i>

<a href="https://prynth.in/admin">👉 Open Admin to Restock Spool</a>`;

  return await dispatchNotification({
    plainText,
    formattedHtml,
    subject: `Filament Over: ${filament.name} (${filament.colorName})`,
  });
}

/**
 * Trigger alert when a filament spool reaches low stock (1 spool remaining)
 */
export async function notifyFilamentLow(filament: {
  name: string;
  material: string;
  colorName: string;
  spoolsRemaining: number;
}) {
  const config = await getNotificationConfig();
  if (!config.notifyOnLowStock) return;

  const plainText =
    `🟡 LOW FILAMENT WARNING
Spool: ${filament.name} (${filament.colorName})
Stock: Only ${filament.spoolsRemaining} spool remaining in print farm.

Consider ordering a replacement soon.
Inventory: https://prynth.in/admin`;

  const formattedHtml =
    `<b>🟡 LOW FILAMENT WARNING</b>
Spool: <b>${filament.name}</b> (${filament.colorName})
Stock: <b>Only ${filament.spoolsRemaining} spool remaining</b> in print farm.

<i>Consider ordering a replacement spool soon.</i>
<a href="https://prynth.in/admin">👉 Manage Inventory</a>`;

  return await dispatchNotification({
    plainText,
    formattedHtml,
    subject: `Low Stock: ${filament.name} (1 spool left)`,
  });
}

/**
 * Trigger alert when a new customer inquiry/contact message is submitted
 */
export async function notifyNewInquiry(inquiry: {
  name: string;
  email: string;
  message: string;
}) {
  const config = await getNotificationConfig();
  if (!config.notifyOnInquiry) return;

  const preview = inquiry.message.length > 250 ? inquiry.message.slice(0, 250) + "…" : inquiry.message;

  const plainText =
    `✉️ NEW CUSTOMER INQUIRY
From: ${inquiry.name} (${inquiry.email})
Message:
"${preview}"

Reply in Admin: https://prynth.in/admin`;

  const formattedHtml =
    `<b>✉️ NEW CUSTOMER INQUIRY</b>
<b>From:</b> ${inquiry.name} (${inquiry.email})

<b>Message:</b>
<blockquote>${preview}</blockquote>

<a href="https://prynth.in/admin">👉 Reply to Message in Admin</a>`;

  return await dispatchNotification({
    plainText,
    formattedHtml,
    subject: `New Inquiry from ${inquiry.name}`,
  });
}

/**
 * Trigger immediate phone and email alert when a new custom 3D design request is submitted
 */
export async function notifyCustomDesignRequest(request: {
  ticketId: number;
  name: string;
  email: string;
  phone?: string;
  idea: string;
  sizeName?: string;
  materialName?: string;
  colorName?: string;
  quantity?: number;
  printerName?: string;
  photosCount?: number;
}) {
  const config = await getNotificationConfig();
  if (!config.notifyOnInquiry) return;

  const plainText =
    `🔔 PRYNTH: NEW CUSTOM 3D PRINT REQUEST #${request.ticketId}
Customer: ${request.name} (${request.phone || request.email})
Specs: ${request.sizeName || "Standard"} · ${request.materialName || "PLA"} (${request.colorName || "Standard"}) · ${request.quantity || 1} unit(s)
${request.photosCount ? `Photos Attached: ${request.photosCount}\n` : ""}
Description:
"${request.idea.slice(0, 180)}${request.idea.length > 180 ? "..." : ""}"

Send official quote: https://prynth.in/admin?tab=inquiries`;

  const formattedHtml =
    `<b>🔔 PRYNTH: NEW CUSTOM 3D PRINT REQUEST #${request.ticketId}</b>
<b>Customer:</b> ${request.name} (${request.phone || request.email})
<b>Specs:</b> ${request.sizeName} · ${request.materialName} (${request.colorName}) · ${request.quantity} unit(s)
${request.photosCount ? `<b>Photos:</b> ${request.photosCount} attached\n` : ""}
<b>Description:</b>
<blockquote>${request.idea.slice(0, 250)}${request.idea.length > 250 ? "..." : ""}</blockquote>

<a href="https://prynth.in/admin?tab=inquiries">👉 Open Inquiries to Send Quote</a>`;

  return await dispatchNotification({
    plainText,
    formattedHtml,
    subject: `New Custom 3D Design Request #${request.ticketId} from ${request.name}`,
  });
}

/**
 * Trigger a test alert to verify notification channels on the user's phone
 */
export async function sendTestNotification(_channel?: "all" | "whatsapp" | "telegram" | "sms" | "email") {
  const timeStr = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const plainText =
    `🎉 PRYNTH PHONE ALERT TEST (${timeStr})
Your phone notification system is working perfectly!
You will receive instant alerts here for new orders, finished filaments, and inquiries.`;

  const formattedHtml =
    `<b>🎉 PRYNTH PHONE ALERT TEST (${timeStr})</b>
Your phone notification system is working perfectly!
You will receive instant alerts here for <b>new orders</b>, <b>finished filaments</b>, and <b>customer inquiries</b>.`;

  return await dispatchNotification({
    plainText,
    formattedHtml,
    subject: `Test Phone Notification (${timeStr})`,
  });
}
