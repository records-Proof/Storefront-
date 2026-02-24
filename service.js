import crypto from "crypto";
import { getDb, logEvent } from "../../lib/db.js";

function makeLicenseId(){
  return "lic_" + crypto.randomBytes(16).toString("hex");
}

export async function issueLicensesForOrder(orderId, ownerEmail){
  if (!ownerEmail) return;
  const db = getDb();
  const items = db.prepare("SELECT product_id, qty FROM order_items WHERE order_id=?").all(orderId);

  const ins = db.prepare("INSERT OR REPLACE INTO licenses (license_id,product_id,owner_email,max_activations,activation_count,issued_at,expires_at,status) VALUES (?,?,?,?,?,?,?,?)");

  for (const it of items){
    // one license per product (enterprise can change to per-seat)
    const licenseId = makeLicenseId();
    ins.run(licenseId, it.product_id, ownerEmail, 3, 0, new Date().toISOString(), null, "active");
  }
  logEvent("LICENSES_ISSUED", { order_id: orderId, owner_email: ownerEmail, count: items.length });
}

export function verifyLicense(licenseId){
  const db = getDb();
  const lic = db.prepare("SELECT * FROM licenses WHERE license_id=?").get(licenseId);
  if (!lic) return { ok:false, error:"Not found" };
  if (lic.status !== "active") return { ok:false, error:"Inactive" };
  if (lic.expires_at && new Date(lic.expires_at).getTime() < Date.now()) return { ok:false, error:"Expired" };
  return { ok:true, license: lic };
}

export function activateLicense(licenseId){
  const db = getDb();
  const lic = db.prepare("SELECT * FROM licenses WHERE license_id=?").get(licenseId);
  if (!lic) return { ok:false, error:"Not found" };
  if (lic.activation_count >= lic.max_activations) return { ok:false, error:"Activation limit reached" };
  db.prepare("UPDATE licenses SET activation_count=activation_count+1 WHERE license_id=?").run(licenseId);
  return { ok:true };
}
