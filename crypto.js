import crypto from "crypto";

const SECRET = process.env.DELIVERY_SIGNING_SECRET || "";
const TTL = Number(process.env.DELIVERY_TOKEN_TTL_SECONDS || 86400);

function b64url(input){
  return Buffer.from(input).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function unb64url(str){
  str = str.replace(/-/g,"+").replace(/_/g,"/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}
function hmac(data){
  return crypto.createHmac("sha256", SECRET).update(data).digest();
}

export function tokenTTLSeconds(){ return TTL; }

export function signDeliveryToken(payloadObj){
  if (!SECRET) throw new Error("Missing DELIVERY_SIGNING_SECRET");
  const payload = b64url(JSON.stringify(payloadObj));
  const sig = b64url(hmac(payload));
  return `${payload}.${sig}`;
}

export function verifyDeliveryToken(token){
  if (!SECRET) return { ok:false, error:"Missing DELIVERY_SIGNING_SECRET" };
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return { ok:false, error:"Malformed token" };
  const expected = b64url(hmac(payload));
  if (Buffer.from(expected).length !== Buffer.from(sig).length) return { ok:false, error:"Bad signature" };
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return { ok:false, error:"Bad signature" };
  const obj = JSON.parse(unb64url(payload).toString("utf-8"));
  const now = Math.floor(Date.now()/1000);
  if (!obj.exp || now > obj.exp) return { ok:false, error:"Token expired" };
  return { ok:true, payload: obj };
}
