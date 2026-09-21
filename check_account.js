import { getSql } from './src/lib/db.js';
async function main() {
  const sql = await getSql();
  const res = await sql`SELECT * FROM account LIMIT 1`;
  console.log(res);
  process.exit(0);
}
main();
