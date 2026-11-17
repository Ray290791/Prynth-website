import { describe, it, expect } from "vitest";
import {
  formatReplyTextToHtml,
  generateQuoteEmailFullHtml,
} from "../src/lib/quote-email-formatter";

describe("Quote Email Formatter & Studio Template", () => {
  it("formats bullet lists and key-value specs into styled HTML", () => {
    const raw = `Hi Abhishek,

Specifications:
• Material: PLA (Bone White)
• Infill: 20% Gyroid
• Technology: Bambu Lab CoreXY

Best regards,
Ray Kapadia
Prynth Studio`;

    const html = formatReplyTextToHtml(raw);
    expect(html).toContain("<strong style=\"color: #0f172a; font-weight: 600;\">Material:</strong>");
    expect(html).toContain("PLA (Bone White)");
    expect(html).toContain("<ul style=\"margin: 10px 0 16px 0;");
    expect(html).toContain("border-top: 1px dashed #cbd5e1;");
  });

  it("handles markdown bolding and line breaks inside paragraphs", () => {
    const raw = "This is a **custom prototype** with 0.16mm layer height.\nSecond line.";
    const html = formatReplyTextToHtml(raw);
    expect(html).toContain('<strong style="color: #0f172a;">custom prototype</strong>');
    expect(html).toContain("<br/>Second line.");
  });

  it("assembles the complete luxury Prynth quote email with hero price card", () => {
    const emailHtml = generateQuoteEmailFullHtml({
      customerName: "Aditya Maurya",
      replyMessage: "We can manufacture your drone mount in carbon-fiber PETG.",
      originalMessage: "Need a lightweight drone camera arm.",
      quoteAmount: 1450,
      turnaround: "3-4 business days",
      ticketId: 6,
    });

    expect(emailHtml).toContain("prynth<span style=\"color: #00b8a9;\">!</span>");
    expect(emailHtml).toContain("Studio Quotation Amount");
    expect(emailHtml).toContain("₹1,450");
    expect(emailHtml).toContain("3-4 business days");
    expect(emailHtml).toContain("Reference: Your Original Inquiry Details [#6]");
    expect(emailHtml).toContain("CoreXY Precision");
    expect(emailHtml).toContain("Zero-Flaw Guarantee");
  });
});
