import { getSql } from "../src/lib/db";
async function check() {
  const sql = await getSql();
  const session = await sql`SELECT * FROM "session" LIMIT 1`;
  const order = await sql`SELECT * FROM "orders" LIMIT 1`;
  console.log("Session:", session[0]);
  console.log("Order:", order[0]);
}
check().catch(console.error);
