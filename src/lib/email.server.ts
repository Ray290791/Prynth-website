import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"; // Use onboarding for testing without verified domain

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
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
                  <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; background-color: #f4f4f5;" />
                  <div>
                    <strong style="display: block; font-size: 14px; color: #111;">${item.name}</strong>
                    <span style="font-size: 12px; color: #666;">
                      ${item.color || ''} ${item.size ? `· ${item.size}` : ''} · Qty: ${item.qty}
                    </span>
                  </div>
                </div>
              </td>
              <td style="padding: 12px 0; text-align: right; vertical-align: top; border-bottom: 1px solid #f4f4f5; font-size: 14px; font-weight: 500;">
                ${formatINR(item.unitPrice * item.qty)}
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

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Order Confirmation - ${orderNumber}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; background-color: #fff;">
        <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; color: #000;">Prynth!</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="font-size: 20px; color: #111; margin-top: 0; margin-bottom: 8px;">Order Confirmed</h2>
          <p style="margin: 0 0 24px; color: #666; font-size: 15px;">Order #${orderNumber}</p>
          
          <p style="font-size: 15px;">Hi ${name},</p>
          <p style="font-size: 15px;">Thank you for your order. We're getting it ready and will notify you as soon as it ships.</p>
          
          ${itemsHtml}
          
          <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #666; text-align: center;">
            <p style="margin: 0 0 8px;">Have questions? Reply to this email or visit our <a href="https://prynth.com/contact" style="color: #000; text-decoration: underline;">help center</a>.</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Prynth. All rights reserved.</p>
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
