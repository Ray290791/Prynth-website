import { getSql } from "./src/lib/db.ts";

async function run() {
  const sql = await getSql();
  const rows = await sql.query(`SELECT slug, sizes FROM products`);
  console.log(rows);
  
  await sql.query(`UPDATE products SET sizes = '["Standard", "Plus", "Max"]' WHERE slug = 'wave-stand'`);
  await sql.query(`UPDATE products SET sizes = '["Small", "Medium", "Large"]' WHERE slug = 'catch-bowl'`);
  console.log("Updated sizes in DB");
  
  process.exit(0);
}

run().catch(console.error);
