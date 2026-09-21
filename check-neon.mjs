import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query("SELECT * FROM products");
    console.log(`Found ${res.rows.length} products`);
    if (res.rows.length > 0) {
      console.log("First product:", res.rows[0].name);
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    pool.end();
  }
}

main();
