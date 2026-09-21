import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";

export const submitContactMessage = createServerFn({ method: "POST" })
  .validator((data: { name: string; email: string; message: string }) => data)
  .handler(async ({ data }) => {
    const sql = await getSql();
    
    // We can insert this into the tickets table.
    // If the user is logged in, we could attach the user_id, but the form is public.
    // So we'll use a generic "guest" user_id if tickets require one, or we can use the email as user_id for now since `tickets.user_id` is required.
    const userId = "guest-" + data.email;

    await sql`
      INSERT INTO tickets (user_id, title, description, status)
      VALUES (${userId}, ${`Contact from ${data.name}`}, ${data.message}, 'open')
    `;

    const { sendContactFormEmail } = await import("./email.server");
    await sendContactFormEmail(data.name, data.email, data.message);

    return { success: true };
  });
