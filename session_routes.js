import express from "express";
import Stripe from "stripe";

export const stripeSessionRouter = express.Router();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

stripeSessionRouter.get("/session/:id", async (req,res) => {
  try{
    const s = await stripe.checkout.sessions.retrieve(req.params.id, { expand:["line_items"] });
    res.json({
      id: s.id,
      payment_status: s.payment_status,
      customer_email: s.customer_details?.email || s.customer_email || null,
      amount_total: s.amount_total,
      currency: s.currency,
      items: (s.line_items?.data || []).map(li => ({ description: li.description, quantity: li.quantity, amount_total: li.amount_total }))
    });
  } catch(e){
    res.status(500).json({ error: e.message || "Failed" });
  }
});
