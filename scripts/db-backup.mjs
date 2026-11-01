#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dns from "node:dns";
import pg from "pg";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && existsSync(".env")) {
  const envText = readFileSync(".env", "utf8");
  const match = envText.match(/^DATABASE_URL=(.*)$/m);
  if (match) {
    databaseUrl = match[1].trim().replace(/["']/g, '');
  }
}

if (!databaseUrl) {
  console.log("[db-backup] DATABASE_URL not set — skipping backup.");
  process.exit(0);
}

databaseUrl = databaseUrl.trim().replace(/[&?]channel_binding=[^&]+/g, "");

async function main() {
  const urlObj = new URL(databaseUrl);
  let host = urlObj.hostname;
  const originalHost = host;

  // Resolve hostname using 8.8.8.8 if system DNS refuses
  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);
    const ips = await resolver.resolve4(host);
    if (ips && ips.length > 0) {
      host = ips[0];
      console.log(`[db-backup] Resolved ${originalHost} to ${host}`);
    }
  } catch (e) {
    console.warn("[db-backup] DNS custom resolve error, using default host:", e.message);
  }

  const pool = new pg.Pool({
    user: decodeURIComponent(urlObj.username),
    password: decodeURIComponent(urlObj.password),
    host: host,
    port: Number(urlObj.port) || 5432,
    database: urlObj.pathname.slice(1),
    ssl: {
      rejectUnauthorized: false,
      servername: originalHost,
    },
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const backup = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      // Skip binary-heavy or transient tables if needed, but here backup all
      const dataRes = await client.query(`SELECT * FROM "${tableName}"`);
      backup.tables[tableName] = dataRes.rows;
      console.log(`[db-backup] Exported ${dataRes.rows.length} rows from ${tableName}`);
    }

    const backupDir = join(dirname(fileURLToPath(import.meta.url)), "..", "backups");
    await mkdir(backupDir, { recursive: true });
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const targetPath = join(backupDir, filename);
    await writeFile(targetPath, JSON.stringify(backup, null, 2), "utf8");
    console.log(`[db-backup] Successfully saved backup to ${targetPath}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("[db-backup error]:", err);
  process.exit(1);
});
