import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.resolve(__dirname, "../.env");
console.log("Loading .env from:", envPath);

let dbUrl = "postgresql://postgres:postgres@localhost:5432/postgres";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || "").trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (key === "DATABASE_URL") {
        dbUrl = value;
      }
    }
  }
}

console.log("Connecting to database...");
const { Client } = pg;
const client = new Client({ connectionString: dbUrl });

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully!");
    
    const res = await client.query("UPDATE users SET balance = 100000;");
    console.log(`Successfully updated ${res.rowCount} users' balances to $1,000.00!`);
    
    const delTx = await client.query("DELETE FROM transactions;");
    console.log(`Cleared ${delTx.rowCount} old transactions.`);
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

run();
