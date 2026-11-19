/**
 * Formats admin custom quote replies into a luxury, branded email template
 * for Prynth! 3D Printing Studio.
 * 
 * Works symmetrically in client-side preview and server-side Resend email rendering.
 */

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface QuoteEmailTemplateParams {
  customerName: string;
  replyMessage: string;
  originalMessage?: string;
  quoteAmount?: number;
  turnaround?: string;
  ticketId?: number;
  brandEmail?: string;
  brandWebsite?: string;
}

/**
 * Parses user-typed plain text / markdown reply from the admin textarea into
 * clean, semantic, styled HTML (headers, bullet lists, key-values, paragraphs, signature).
 */
export function formatReplyTextToHtml(rawText: string): string {
  if (!rawText) return "";
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n{2,}/);

  const htmlBlocks: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // 1. Signature block check (Best regards, etc.)
    const isSignature = lines.some((l) =>
      /^(best regards|regards|warmly|sincerely|cheers|thanks & regards|the prynth team|ray kapadia)/i.test(l)
    );
    if (isSignature) {
      const sigHtml = lines.map((l) => escapeHtml(l)).join("<br/>");
      htmlBlocks.push(`
        <div style="margin-top: 26px; padding-top: 16px; border-top: 1px dashed #cbd5e1; color: #64748b; font-size: 13.5px; line-height: 1.6;">
          ${sigHtml}
        </div>
      `);
      continue;
    }

    // 2. Standalone Section Header (e.g. "Next Steps:", "Specifications:", "### Details")
    const isHeaderLine = lines.length === 1 && (lines[0].endsWith(":") || lines[0].startsWith("#"));
    if (isHeaderLine) {
      const cleanHeader = lines[0].replace(/^#+\s*/, "");
      htmlBlocks.push(`
        <h4 style="margin: 22px 0 8px 0; font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">
          ${escapeHtml(cleanHeader)}
        </h4>
      `);
      continue;
    }

    // 3. List / Key-Value block (lines starting with bullets, dashes, or numbered lists)
    const hasListItems = lines.some((l) => /^([•\-*]|\d+\.)\s+/.test(l));
    if (hasListItems) {
      let listItemsHtml = "";
      for (const line of lines) {
        if (/^([•\-*]|\d+\.)\s+/.test(line)) {
          const itemContent = line.replace(/^([•\-*]|\d+\.)\s+/, "");
          // Check for Key: Value pattern
          const kvMatch = itemContent.match(/^([^:]+):\s*(.*)$/);
          let formattedItem: string;
          if (kvMatch) {
            formattedItem = `<strong style="color: #0f172a; font-weight: 600;">${escapeHtml(kvMatch[1])}:</strong> ${escapeHtml(kvMatch[2])}`;
          } else {
            formattedItem = escapeHtml(itemContent);
          }
          // Markdown bold inside list item
          formattedItem = formattedItem.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a;">$1</strong>');

          listItemsHtml += `
            <li style="margin-bottom: 7px; padding-left: 20px; position: relative; font-size: 14px; line-height: 1.6; color: #334155;">
              <span style="position: absolute; left: 0; top: 0; color: #00b8a9; font-weight: 800; font-size: 15px;">•</span>
              ${formattedItem}
            </li>
          `;
        } else {
          // Label right above list (e.g. "Specifications:")
          listItemsHtml += `<div style="font-weight: 700; color: #0f172a; margin-bottom: 8px; font-size: 14px;">${escapeHtml(line)}</div>`;
        }
      }
      htmlBlocks.push(`
        <ul style="margin: 10px 0 16px 0; padding-left: 0; list-style: none;">
          ${listItemsHtml}
        </ul>
      `);
      continue;
    }

    // 4. Normal paragraph
    let paraHtml = escapeHtml(lines.join("\n"));
    // Markdown bold **text**
    paraHtml = paraHtml.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a;">$1</strong>');
    // Line breaks inside paragraph
    paraHtml = paraHtml.replace(/\n/g, "<br/>");

    htmlBlocks.push(`
      <p style="margin: 0 0 14px 0; font-size: 14.5px; line-height: 1.7; color: #334155;">
        ${paraHtml}
      </p>
    `);
  }

  return htmlBlocks.join("");
}

/**
 * Generates the full HTML email document ready for Resend or in-modal preview
 */
export function generateQuoteEmailFullHtml(params: QuoteEmailTemplateParams): string {
  const formattedBody = formatReplyTextToHtml(params.replyMessage);
  const brandEmail = params.brandEmail || "hello@prynth.in";
  const brandWebsite = params.brandWebsite || "https://prynth.in";

  // Quotation Hero Box
  let quoteHeroBanner = "";
  if (params.quoteAmount && !isNaN(params.quoteAmount)) {
    const formattedAmount = Number(params.quoteAmount).toLocaleString("en-IN");
    quoteHeroBanner = `
      <div style="margin: 20px 0 24px; padding: 20px 22px; background: linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%); border: 1.5px solid #14b8a6; border-radius: 10px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0d9488;">Studio Quotation Amount</div>
              <div style="font-size: 28px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ₹${formattedAmount}
                <span style="font-size: 12px; font-weight: 500; color: #64748b; margin-left: 6px;">(Inclusive of packaging & taxes)</span>
              </div>
            </td>
            ${
              params.turnaround
                ? `
            <td style="vertical-align: top; text-align: right;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0d9488;">Turnaround</div>
              <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin-top: 6px;">
                ⏱️ ${escapeHtml(params.turnaround)}
              </div>
            </td>`
                : ""
            }
          </tr>
        </table>
      </div>
    `;
  }

  // Original Inquiry Card
  let originalInquiryHtml = "";
  if (params.originalMessage) {
    originalInquiryHtml = `
      <div style="margin-top: 30px; padding: 16px 18px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-size: 12.5px; color: #64748b;">
        <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 6px;">
          Reference: Your Original Inquiry Details ${params.ticketId ? `[#${params.ticketId}]` : ""}
        </div>
        <div style="white-space: pre-wrap; font-style: italic; color: #334155; line-height: 1.55;">
          ${escapeHtml(params.originalMessage)}
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation from Prynth Studio</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 auto; max-width: 620px;">
    <tr>
      <td>
        <!-- Main Card Container -->
        <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Branded Studio Header -->
          <div style="background: linear-gradient(135deg, #090d16 0%, #111827 100%); padding: 24px 28px; border-bottom: 3px solid #00b8a9;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em;">prynth<span style="color: #00b8a9;">!</span></span>
                  <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Precision 3D Printing & Custom Fabrication Studio</div>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <span style="display: inline-block; padding: 4px 12px; background-color: rgba(0, 184, 169, 0.15); border: 1px solid rgba(0, 184, 169, 0.4); border-radius: 20px; font-size: 11px; font-weight: 700; color: #2dd4bf; text-transform: uppercase; letter-spacing: 0.06em;">
                    Studio Quotation
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Body Container -->
          <div style="padding: 28px 28px 24px;">
            ${quoteHeroBanner}
            
            <!-- Customer Formatted Body -->
            <div style="margin-top: 8px;">
              ${formattedBody}
            </div>

            <!-- Call to action pill -->
            <div style="margin: 24px 0 16px; padding: 16px 18px; background-color: #f8fafc; border-left: 4px solid #00b8a9; border-radius: 6px;">
              <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 4px;">How to Confirm & Proceed</div>
              <div style="font-size: 13.5px; color: #475569; line-height: 1.55;">
                Simply <strong>reply directly to this email</strong> to confirm this quote or suggest design refinements. Our engineering team will reserve print capacity and share your payment link.
              </div>
            </div>

            <!-- Quality Pillars -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 11.5px; color: #64748b;">
                <tr>
                  <td style="width: 33.33%; padding: 4px 8px 4px 0; vertical-align: top;">
                    <strong style="display: block; color: #0f172a;">⚡ CoreXY Precision</strong>
                    Calibrated Bambu Lab fleet
                  </td>
                  <td style="width: 33.33%; padding: 4px 8px; vertical-align: top;">
                    <strong style="display: block; color: #0f172a;">🛡️ Zero-Flaw Guarantee</strong>
                    Free reprint if out of spec
                  </td>
                  <td style="width: 33.33%; padding: 4px 0 4px 8px; vertical-align: top;">
                    <strong style="display: block; color: #0f172a;">📦 Pan-India Courier</strong>
                    Secure protective packaging
                  </td>
                </tr>
              </table>
            </div>

            ${originalInquiryHtml}
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
            <div>Prynth 3D Printing Studio · Mumbai, Maharashtra, India</div>
            <div style="margin-top: 4px;">
              <a href="${brandWebsite}" style="color: #00b8a9; text-decoration: none; font-weight: 600;">prynth.in</a> · 
              <a href="mailto:${brandEmail}" style="color: #00b8a9; text-decoration: none; font-weight: 600;">${brandEmail}</a>
            </div>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
