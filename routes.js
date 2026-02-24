import express from "express";
import Stripe from "stripe";
import { getDb, logEvent } from "../../lib/db.js";
import { issueLicensesForOrder } from "../licenses/service.js";
import { sendDeliveryEmailForOrder } from "../delivery/email.js";
import { stripeSessionRouter } from "./session_routes.js";

export const stripeWebhookRouter = express.Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// webhook needs raw body
stripeWebhookRouter.post("/webhook", express.raw({ type: "application/json" }), async (req,res) => {
  if (!WEBHOOK_SECRET) return res.status(400).send("Missing STRIPE_WEBHOOK_SECRET");
  const sig = req.headers["stripe-signature"];
  let event;
  try{
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch(e){
    return res.status(400).send(`Webhook error: ${e.message}`);
  }

  try{
    if (event.type === "checkout.session.completed"){
      const session = event.data.object;
      const full = await stripe.checkout.sessions.retrieve(session.id, { expand:["line_items"] });
      const email = full.customer_details?.email || full.customer_email || null;

      const db = getDb();
      // create order
      db.prepare("INSERT OR REPLACE INTO orders (id,user_id,email,payment_status,amount_total_cents,currency,created_at,raw_json) VALUES (?,?,?,?,?,?,?,?)")
        .run(full.id, null, email, full.payment_status, full.amount_total || 0, full.currency || "", new Date().toISOString(), JSON.stringify(full));

      // order items
      db.prepare("DELETE FROM order_items WHERE order_id=?").run(full.id);
      const insItem = db.prepare("INSERT INTO order_items (order_id,product_id,title,qty,unit_price_cents) VALUES (?,?,?,?,?)");

      for (const li of (full.line_items?.data || [])){
        const pid = li.price?.product?.metadata?.pid || null;
        insItem.run(full.id, pid || "", li.description || "Item", li.quantity || 1, (li.price?.unit_amount || 0));
      }

      logEvent("ORDER_PAID", { order_id: full.id, email });

      // issue licenses (optional)
      await issueLicensesForOrder(full.id, email);

      // send gated delivery email
      if (full.payment_status === "paid" && email){
        await sendDeliveryEmailForOrder(full.id, email);
      }
    }

    return res.json({ received:true });
  } catch(e){
    return res.status(500).send("Webhook handler failed");
  }
});


// session fetch (for success page)
stripeWebhookRouter.use(stripeSessionRouter);
