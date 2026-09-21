import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"; // Use onboarding for testing without verified domain

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOrderConfirmationEmail(orderNumber: string, email: string, name: string) {
  const resend = getResend();
  if (!resend) {
    console.log("No RESEND_API_KEY set, skipping order confirmation email to", email);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Order Confirmation - ${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="background-color: #f4f4f5; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; color: #111;">Order Confirmed</h1>
          <p style="margin: 8px 0 0; color: #666;">Order #${orderNumber}</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="font-size: 18px; color: #111; margin-top: 0;">Hi ${name},</h2>
          <p>Thank you for your order! We have received your 3D printing request and it is now <strong>pending review</strong>.</p>
          <p>We'll notify you as soon as we start printing. You can check your order status on your dashboard at any time.</p>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666;">
            <p style="margin: 0;">Cheers,<br/><strong>The Prynth Team</strong></p>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendOrderStatusUpdateEmail(orderNumber: string, email: string, status: string) {
  const resend = getResend();
  if (!resend) {
    console.log("No RESEND_API_KEY set, skipping order status email to", email);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Order Update - ${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="background-color: #f4f4f5; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; color: #111;">Order Update</h1>
          <p style="margin: 8px 0 0; color: #666;">Order #${orderNumber}</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="font-size: 18px; color: #111; margin-top: 0;">Status Changed</h2>
          <p>Your order is now: <strong style="color: #111; padding: 4px 8px; background-color: #e4e4e7; border-radius: 4px;">${status.toUpperCase()}</strong></p>
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

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      replyTo: replyToEmail,
      subject: `New Contact Form Message from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #333; line-height: 1.6;">
          <div style="background-color: #f4f4f5; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px; color: #111;">New Message via Contact Form</h1>
            <p style="margin: 4px 0 0; color: #666;"><strong>From:</strong> ${name} (${replyToEmail})</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="font-size: 16px; color: #111; margin-top: 0;">Message:</h2>
            <div style="padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; white-space: pre-wrap;">
              ${message}
            </div>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666;">
              <p style="margin: 0;">Reply directly to this email to respond to ${name}.</p>
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
