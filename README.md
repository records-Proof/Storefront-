# Enterprise Storefront Platform — v2 Code Framework (Bundle)

This is a **production-style starter framework** that upgrades the v1 storefront into an enterprise platform:

- ✅ Auth (JWT + httpOnly cookie) + roles (admin/customer/affiliate)
- ✅ Storefront (static web) + cart + Stripe checkout
- ✅ Webhooks (Stripe signature verification)
- ✅ Gated delivery (expiring signed links) + delivery email
- ✅ License engine (issue/verify) + customer portal endpoints
- ✅ Subscriptions (stubs + Stripe customer portal hook points)
- ✅ Affiliates (referral codes + attribution stubs)
- ✅ Analytics (basic KPIs endpoints)
- ✅ Admin endpoints (products/orders/licenses/users)
- ✅ SQLite DB (single-file) + migrations bootstrap

## Run
```bash
npm install
cp .env.example .env
npm run dev
```
Open: http://127.0.0.1:8080/

## Stripe webhook (local)
```bash
stripe login
stripe listen --forward-to http://127.0.0.1:8080/api/stripe/webhook
```

## Files / folders
- `server/` backend
- `web/` frontend pages (static)
- `deliverables/` private deliverable files
- `data/` SQLite db + order records

## Security notes (do before production)
- Set strong `JWT_SECRET` and `DELIVERY_SIGNING_SECRET`
- Deploy behind HTTPS and set `COOKIE_SECURE=1`
- Put deliverables behind private storage if needed (S3 + signed URLs)
- Add CSP headers (optional), and tighten rate limits

