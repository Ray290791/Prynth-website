import { Resend } from "resend";
import { getSql } from "./db";

export async function getSenderEmail(): Promise<string> {
  try {
    const sql = await getSql();
    const rows = await sql<{ value: string }>`
      SELECT value FROM site_settings WHERE key = 'resend_from_email' LIMIT 1
    `;
    if (rows.length > 0 && rows[0].value && rows[0].value.trim()) {
      return rows[0].value.trim();
    }
  } catch (err) {
    // If DB read fails, fall back to environment variable
  }
  return process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
}

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendOrderConfirmationEmail(
  orderNumber: string, 
  email: string, 
  name: string,
  orderDetails?: { items: any[], subtotal: number, shipping: number, extra: number, total: number }
) {
  const resend = getResend();
  if (!resend) {
    console.log("No RESEND_API_KEY set, skipping order confirmation email to", email);
    return;
  }

  // Format INR helper
  const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const safeOrderNumber = escapeHtml(orderNumber);
  const safeName = escapeHtml(name);

  let itemsHtml = '';
  if (orderDetails && orderDetails.items) {
    itemsHtml = `
      <div style="margin-top: 24px;">
        <h3 style="font-size: 16px; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px; margin-bottom: 16px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${orderDetails.items.map(item => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${escapeHtml(item.image) || 'https://via.placeholder.com/80'}" alt="${escapeHtml(item.name)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; background-color: #f4f4f5;" />
                  <div>
                    <strong style="display: block; font-size: 14px; color: #111;">${escapeHtml(item.name)}</strong>
                    <span style="font-size: 12px; color: #666;">
                      ${escapeHtml(item.color) || ''} ${item.size ? `· ${escapeHtml(item.size)}` : ''} · Qty: ${Number(item.qty) || 1}
                    </span>
                  </div>
                </div>
              </td>
              <td style="padding: 12px 0; text-align: right; vertical-align: top; border-bottom: 1px solid #f4f4f5; font-size: 14px; font-weight: 500;">
                ${formatINR((Number(item.unitPrice) || 0) * (Number(item.qty) || 1))}
              </td>
            </tr>
          `).join('')}
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Subtotal</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatINR(orderDetails.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Shipping</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 500;">${orderDetails.shipping === 0 ? 'Free' : formatINR(orderDetails.shipping)}</td>
          </tr>
          ${orderDetails.extra > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #666;">Extra (COD Fee)</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatINR(orderDetails.extra)}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px 0; color: #111; font-weight: bold; border-top: 1px solid #e4e4e7; font-size: 16px;">Total</td>
            <td style="padding: 12px 0; text-align: right; font-weight: bold; border-top: 1px solid #e4e4e7; font-size: 16px; color: #000;">
              ${formatINR(orderDetails.total)}
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  try {
    const fromEmail = await getSenderEmail();
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Confirmation - ${safeOrderNumber}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; background-color: #fff;">
          <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; color: #000;">Prynth!</h1>
          </div>
          <div style="padding: 32px 24px;">
            <h2 style="font-size: 20px; color: #111; margin-top: 0; margin-bottom: 8px;">Order Confirmed</h2>
            <p style="margin: 0 0 24px; color: #666; font-size: 15px;">Order #${safeOrderNumber}</p>
            
            <p style="font-size: 15px;">Hi ${safeName},</p>
            <p style="font-size: 15px;">Thank you for your order. We're getting it ready and will notify you as soon as it ships.</p>
            
            ${itemsHtml}
            
            <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666; text-align: center;">
              <p style="margin: 0 0 8px;">Have questions? Reply to this email or visit our <a href="https://prynth.in/contact" style="color: #000; text-decoration: underline;">help center</a>.</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Prynth. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send order confirmation email via Resend:", err);
  }
}

export async function sendOrderStatusUpdateEmail(orderNumber: string, email: string, status: string) {
  const resend = getResend();
  if (!resend) {
    console.log("No RESEND_API_KEY set, skipping order status email to", email);
    return;
  }

  const safeOrderNumber = escapeHtml(orderNumber);
  const safeStatus = escapeHtml(status);
  const fromEmail = await getSenderEmail();

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Order Update - ${safeOrderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="background-color: #f4f4f5; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; color: #111;">Order Update</h1>
          <p style="margin: 8px 0 0; color: #666;">Order #${safeOrderNumber}</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="font-size: 18px; color: #111; margin-top: 0;">Status Changed</h2>
          <p>Your order is now: <strong style="color: #111; padding: 4px 8px; background-color: #e4e4e7; border-radius: 4px;">${safeStatus.toUpperCase()}</strong></p>
          <p>You can check your dashboard for more details and tracking information.</p>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666;">
            <p style="margin: 0;">Cheers,<br/><strong>The Prynth Team</strong></p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendContactFormEmail(name: string, replyToEmail: string, message: string) {
  const resend = getResend();
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!resend || !adminEmail) {
    console.log("No RESEND_API_KEY or ADMIN_EMAIL set, skipping contact form email");
    return;
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(replyToEmail);
  const safeMessage = escapeHtml(message);

  try {
    const fromEmail = await getSenderEmail();
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      replyTo: replyToEmail,
      subject: `New Contact Form Message from ${safeName}`,
      html: `
        <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #333; line-height: 1.6;">
          <div style="background-color: #f4f4f5; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px; color: #111;">New Message via Contact Form</h1>
            <p style="margin: 4px 0 0; color: #666;"><strong>From:</strong> ${safeName} (${safeEmail})</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="font-size: 16px; color: #111; margin-top: 0;">Message:</h2>
            <div style="padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; white-space: pre-wrap;">
              ${safeMessage}
            </div>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666;">
              <p style="margin: 0;">Reply directly to this email to respond to ${safeName}.</p>
            </div>
          </div>
        </div>
      `,
    });
    
    if (error) {
      console.error("Resend API Error:", error);
    } else {
      console.log("Email sent successfully:", data);
    }
  } catch (err) {
    console.error("Failed to send contact email:", err);
  }
}

export async function sendTicketReplyEmail(
  name: string,
  toEmail: string,
  originalMessage: string,
  replyMessage: string
) {
  const resend = getResend();
  const adminEmail = process.env.ADMIN_EMAIL || "hello@prynth.in";
  if (!resend) {
    throw new Error("Email service (Resend) is not configured with an API key.");
  }

  const safeName = escapeHtml(name);
  const safeOriginal = escapeHtml(originalMessage);
  const safeReply = escapeHtml(replyMessage);
  const fromEmail = await getSenderEmail();

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    replyTo: adminEmail,
    subject: `Re: Your inquiry to prynth!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e2124; line-height: 1.6;">
        <div style="background-color: #00b8a9; padding: 20px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">prynth! Support</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
          <p style="margin-top: 0;">Hi ${safeName},</p>
          <div style="padding: 16px; background-color: #f9fafb; border-left: 4px solid #00b8a9; border-radius: 4px; white-space: pre-wrap; margin: 16px 0; font-size: 15px;">${safeReply}</div>
          <p style="font-size: 14px; color: #666; margin-bottom: 0;">If you have any further questions, feel free to reply directly to this email.</p>
          <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 13px; color: #888;">
            <p style="margin: 0 0 6px 0; font-weight: 600;">Original Inquiry:</p>
            <div style="white-space: pre-wrap; font-style: italic;">${safeOriginal}</div>
          </div>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("Resend API Error on ticket reply:", error);
    throw new Error(error.message);
  }
  return data;
}

export async function sendCustomRequestAdminEmail(params: {
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
  const resend = getResend();
  const adminEmail = process.env.ADMIN_EMAIL || "hello@prynth.in";
  if (!resend) return;

  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePhone = escapeHtml(params.phone || "Not provided");
  const safeIdea = escapeHtml(params.idea);
  const fromEmail = await getSenderEmail();

  try {
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      replyTo: params.email,
      subject: `[Custom Request #${params.ticketId}] New 3D Print Quote Request from ${safeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111; line-height: 1.6;">
          <div style="background-color: #00b8a9; padding: 20px 24px; border-radius: 8px 8px 0 0; color: #fff;">
            <h1 style="margin: 0; font-size: 20px;">New Custom 3D Design Request #${params.ticketId}</h1>
            <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Review and quote within 24 hours</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px; background-color: #fff;">
            <p><strong>Customer:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
            <p><strong>Phone:</strong> ${safePhone}</p>
            <div style="margin: 16px 0; padding: 16px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; font-size: 15px; color: #334155;">Customer Description:</h3>
              <p style="white-space: pre-wrap; font-size: 14px; margin-bottom: 0;">${safeIdea}</p>
            </div>
            <h4 style="margin: 16px 0 8px 0; font-size: 14px; color: #475569;">Selected Specifications:</h4>
            <ul style="font-size: 13px; color: #334155; padding-left: 20px;">
              <li><strong>Approx. Size:</strong> ${escapeHtml(params.sizeName || "Standard")}</li>
              <li><strong>Material:</strong> ${escapeHtml(params.materialName || "PLA")}</li>
              <li><strong>Color:</strong> ${escapeHtml(params.colorName || "Standard")}</li>
              <li><strong>Quantity:</strong> ${params.quantity || 1}</li>
              <li><strong>Machine:</strong> ${escapeHtml(params.printerName || "Bambu Lab Fleet")}</li>
              <li><strong>Reference Photos:</strong> ${params.photosCount || 0} attached</li>
            </ul>
            <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
              You can review the full request with photos and reply with a quote directly in the <a href="https://prynth.in/admin" style="color: #00b8a9; font-weight: 600;">Admin Dashboard</a>, or reply directly to this email!
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send custom request admin email:", err);
  }
}

export async function sendCustomRequestCustomerAckEmail(params: {
  ticketId: number;
  name: string;
  email: string;
  idea: string;
  materialName?: string;
  photosCount?: number;
}) {
  const resend = getResend();
  if (!resend) return;

  const safeName = escapeHtml(params.name);
  const safeIdea = escapeHtml(params.idea);
  const fromEmail = await getSenderEmail();
  const adminEmail = process.env.ADMIN_EMAIL || "hello@prynth.in";

  try {
    await resend.emails.send({
      from: fromEmail,
      to: params.email,
      replyTo: adminEmail,
      subject: `We've received your custom 3D request! (#${params.ticketId}) - Prynth`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111; line-height: 1.6;">
          <div style="background-color: #00b8a9; padding: 24px; border-radius: 8px 8px 0 0; color: #fff; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700;">prynth!</h1>
            <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Custom 3D Printing & Design Studio</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px; background-color: #fff;">
            <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">Request Received (#${params.ticketId})</h2>
            <p>Hi ${safeName},</p>
            <p>Thank you for submitting your custom 3D design request! Our engineering team is currently reviewing your description, specifications, and reference photos.</p>
            <div style="padding: 16px; background-color: #f8fafc; border-left: 4px solid #00b8a9; border-radius: 4px; margin: 16px 0;">
              <p style="margin: 0; font-weight: 600; font-size: 14px; color: #0f172a;">Next Steps (Within 24 Hours):</p>
              <ul style="margin: 8px 0 0 0; padding-left: 18px; font-size: 13px; color: #475569;">
                <li>We verify 3D print feasibility and structural requirements.</li>
                <li>We calculate precision CAD modeling requirements and filament costs.</li>
                <li>We will send you a personalized quote and delivery timeline directly in this thread.</li>
              </ul>
            </div>
            <div style="margin: 16px 0; padding: 14px; background-color: #f1f5f9; border-radius: 6px; font-size: 13px; color: #334155;">
              <p style="margin: 0 0 4px 0; font-weight: 600;">Your Request Summary:</p>
              <p style="margin: 0; font-style: italic;">&ldquo;${safeIdea}&rdquo;</p>
              ${params.photosCount ? `<p style="margin: 6px 0 0 0; color: #64748b;">${params.photosCount} reference photo(s) attached.</p>` : ""}
            </div>
            <p style="font-size: 14px; color: #475569;">
              Have extra measurements, a ruler photo, or more details to add? <strong>Simply reply directly to this email</strong> to continue the conversation.
            </p>
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 13px; color: #94a3b8; text-align: center;">
              <p style="margin: 0;">Prynth · Precision 3D Printing & Custom Prototyping · Bengaluru, India</p>
            </div>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send customer ack email:", err);
  }
}
