import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";

// In-memory rate limiting map: email -> timestamps[]
const submissionTimestamps = new Map<string, number[]>();

function checkRateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const times = (submissionTimestamps.get(key) || []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    return false;
  }
  times.push(now);
  submissionTimestamps.set(key, times);
  return true;
}

export const submitContactMessage = createServerFn({ method: "POST" })
  .validator((data: { name: string; email: string; message: string }) => {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const message = data.message?.trim();

    if (!name || name.length > 100) {
      throw new Error("Name must be between 1 and 100 characters.");
    }
    if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address (max 150 characters).");
    }
    if (!message || message.length > 3000) {
      throw new Error("Message must be between 1 and 3,000 characters.");
    }

    return { name, email, message };
  })
  .handler(async ({ data }) => {
    // Rate limit per email: max 5 messages per 10 minutes
    if (!checkRateLimit(data.email)) {
      throw new Error("Too many messages submitted. Please wait a few minutes before trying again.");
    }

    const sql = await getSql();
    const userId = "guest-" + data.email;

    await sql`
      INSERT INTO tickets (user_id, title, description, status)
      VALUES (${userId}, ${`Contact from ${data.name}`}, ${data.message}, 'open')
    `;

    const { sendContactFormEmail } = await import("./email.server");
    await sendContactFormEmail(data.name, data.email, data.message);

    return { success: true };
  });
