import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DB_PATH || "./data/app.db";

let db = null;

export function getDb(){
  if (!db) db = new Database(DB_PATH);
  return db;
}

export function initDb(){
  const d = getDb();
  d.pragma("journal_mode = WAL");

  // schema
  d.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    category TEXT,
    subcategory TEXT,
    badge TEXT,
    deliverable_file TEXT,
    download_url TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    email TEXT,
    payment_status TEXT,
    amount_total_cents INTEGER,
    currency TEXT,
    created_at TEXT NOT NULL,
    raw_json TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    title TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS licenses (
    license_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    max_activations INTEGER NOT NULL DEFAULT 1,
    activation_count INTEGER NOT NULL DEFAULT 0,
    issued_at TEXT NOT NULL,
    expires_at TEXT,
    status TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS affiliates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    commission_bps INTEGER NOT NULL DEFAULT 1000,
    total_earned_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `);

  // bootstrap admin if not exists
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPass){
    const row = d.prepare("SELECT id FROM users WHERE email=?").get(adminEmail);
    if (!row){
      const hash = bcrypt.hashSync(adminPass, 12);
      d.prepare("INSERT INTO users (email,password_hash,role,created_at) VALUES (?,?,?,?)")
        .run(adminEmail, hash, "admin", new Date().toISOString());
      console.log("Bootstrapped admin user:", adminEmail);
    }
  }

  // seed sample products if empty
  const count = d.prepare("SELECT COUNT(*) as c FROM products").get().c;
  if (count === 0){
    const now = new Date().toISOString();
    const ins = d.prepare(`INSERT INTO products
      (id,title,description,price_cents,category,subcategory,badge,deliverable_file,download_url,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    ins.run("p1","License Engine Blueprint","Enterprise licensing logic + verification records.",7900,"Licensing","Blueprints","Bestseller","license-engine-blueprint.zip",null,now);
    ins.run("p2","Valuation Doctrine v2","Deterministic valuation and classification framework.",4900,"Licensing","Frameworks","New","valuation-doctrine.pdf",null,now);
    ins.run("p3","Proof Pack Template","Manifest + hashes + verifier scripts.",2900,"Verification","Templates","Featured",null,"https://example.com/private/proof-pack-template.zip",now);
  }
}

export function logEvent(type, payload){
  const d = getDb();
  d.prepare("INSERT INTO events (type,payload_json,created_at) VALUES (?,?,?)")
    .run(type, JSON.stringify(payload), new Date().toISOString());
}
