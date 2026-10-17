# DemoDash — free phone demo at the doorstep

A hyperlocal, quick-commerce-style web app for a mobile-phone shop. Customers book a **free demo at home**, a delivery partner brings the phone, the customer tries it and can **buy it on the spot**. There is **no online payment** in this MVP — the sale happens offline and is recorded in the system.

Built with Next.js 14 (App Router) · TypeScript · Tailwind CSS · PostgreSQL + Prisma.

> The shop name defaults to "Rai Communication" (`SHOP_NAME`) and the product name to "DemoDash" (`NEXT_PUBLIC_APP_NAME`). Both are env-configurable.

## Roles

| Role | Can do |
|---|---|
| **Customer** (no login) | Browse, book a demo, track it live, rate it |
| **Admin** | Everything: bookings dashboard, assign delivery partner, change status / outcome, manage catalog, analytics, create employee & delivery accounts |
| **Employee** | Add / edit products, view all bookings and demo analytics (per-product funnel + per-customer drill-down). **Cannot** assign, change status/outcome, delete products |
| **Delivery** | Sees only their own assignments, navigates (Google Maps), updates status, verifies customer OTP, records outcome, shares live GPS |

## Run locally

Prerequisites: Node 18.18+ and a PostgreSQL database (local, Neon, or Supabase).

```bash
cd demodash
cp .env.example .env          # then edit DATABASE_URL and AUTH_SECRET
npm install
npx prisma migrate deploy     # applies the committed migration (or: npm run db:push for a quick dev setup)
npm run db:seed
npm run dev                    # http://localhost:3000
```

Seeded demo logins (change before going live):

| Role | Login | Password |
|---|---|---|
| Admin | `admin@demodash.local` | `Admin@12345` |
| Employee | `employee@demodash.local` | `Employee@12345` |
| Delivery | `9000000001` (or `rider@demodash.local`) | `Rider@12345` |

Staff sign in at `/login`, delivery partners at `/login?as=delivery` (also linked from the login page). 10 sample phones are seeded with illustration images in `public/phones` — names/prices are placeholders, edit them in **Admin → Products**.

**Phone OTP in development:** with `SMS_PROVIDER=console` the code is printed in the server log and, outside production, also shown in a toast so you can test without an SMS gateway.

### Try the whole flow in ~2 minutes
1. Open `/`, pick a phone → **Book Free Demo**, verify the OTP, confirm. Note the booking ID.
2. Log in as admin (`/login`) → open the booking → **Assign** the rider.
3. Log in as the rider in another browser/phone → open the job → *On the way* → *Arrived* → enter the OTP shown on the customer's `/track/<ID>` page → *Start demo* → *Purchased* + amount.
4. Log in as the employee → **Demo analytics** to see the per-product funnel and click a product for the customer list.

### Scripts
`npm run dev | build | start | lint | typecheck` · `db:push | db:migrate | db:deploy | db:seed | db:reset` · `gen:images` (regenerates sample phone SVGs) · `bash scripts/smoke-test.sh` (API end-to-end test against a running, seeded server; restart the server between repeated runs because booking is rate-limited).

## Project structure

```
demodash/
├─ prisma/            schema.prisma, seed.ts
├─ app/
│  ├─ page.tsx                       customer home (search, categories, product grid)
│  ├─ product/[id]  book/[productId]  confirmation/[code]  track  track/[code]
│  ├─ login/                          staff + delivery login
│  ├─ admin/                          dashboard, bookings(+[id]), products(new,[id]), analytics(+[id]), team
│  ├─ delivery/                       assignments list + job screen (mobile)
│  ├─ uploads/[name]                  serves locally stored images (dev)
│  └─ api/                            public, admin, delivery, auth, otp, geocode routes
├─ components/         customer/, staff/, delivery/, ui, Icons, Toast
├─ lib/                db, auth/session, validation (zod), booking state machine, analytics SQL,
│                      notify (email/SMS/WhatsApp), otp, upload, rate-limit, time, format
├─ middleware.ts       route gate for /admin and /delivery
└─ scripts/            smoke-test.sh, generate-phone-images.mjs
```

## Data model

`User` (ADMIN/EMPLOYEE/DELIVERY) · `Customer` · `MobileProduct` (has a `category` column so ACs / washing machines can be added later) · `DemoBooking` · `DeliveryPersonProfile` · `BookingStatusHistory` · `NotificationLog` · `PhoneOtp` (hashed customer verification codes). Product analytics are computed with SQL aggregation (`lib/analytics.ts`), no extra table.

**Booking status flow:** `PENDING → ASSIGNED → OUT_FOR_DEMO → ARRIVED → DEMO_IN_PROGRESS → COMPLETED` (or `CANCELLED`). Outcome: `PURCHASED_OFFLINE` (+ sale amount), `NOT_PURCHASED` (+ reason), `CUSTOMER_UNAVAILABLE`.
- Delivery partners can only move forward one step at a time; *Start demo* is blocked until the customer's OTP is verified; completing requires an outcome.
- Admins can set any status (to fix mistakes); recording an outcome completes the booking.
- Analytics definitions: **Completed demos** = completed with outcome purchased/not purchased · **Conversion** = purchases ÷ completed demos · **Pending** = not yet completed or cancelled.

## API

Public: `GET /api/products` (filters: `q, brand, segment, min_price, max_price`), `GET /api/products/:id`, `POST /api/bookings`, `GET /api/bookings/:code` (tracking), `POST /api/bookings/:code/rating`, `POST /api/otp/send`, `POST /api/otp/verify`, `GET /api/geocode/reverse`.

Admin/Employee (`/api/admin/...`): `bookings` (filters `status, outcome, product_id, from, to, q, page`), `bookings/:id`, `PATCH bookings/:id/assign|status|outcome` (**ADMIN**), `products` (GET/POST), `products/:id` (GET/PATCH, **DELETE = ADMIN**), `uploads`, `analytics/products`, `analytics/products/:id/bookings`, `analytics/summary`, `delivery-people`, `users` (**ADMIN**).

Delivery: `POST /api/delivery/login`, `GET /api/delivery/assignments`, `PATCH /api/delivery/assignments/:id/status`, `POST /api/delivery/assignments/:id/verify-otp`, `PATCH /api/delivery/location`.

## Configuration (see `.env.example`)

- **Email** — SMTP via Nodemailer (`SMTP_*`). Works with Gmail app passwords, Brevo, or Resend's SMTP (`smtp.resend.com`, user `resend`, password = API key). Empty → emails are logged to the console only.
- **SMS / WhatsApp** — `SMS_PROVIDER=console|twilio|msg91`. Twilio is implemented against its REST API (also used for the optional WhatsApp alert to the owner). MSG91 uses its Flow API and needs a DLT-approved template with one variable (`MSG91_VAR_NAME`) — **this path is implemented but untested here**, verify with your account.
- **Owner alerts** — `ADMIN_NOTIFY_EMAIL` (comma-separated), `ADMIN_NOTIFY_PHONE`, `ADMIN_NOTIFY_WHATSAPP`. Every attempt (sent / failed / skipped) is stored in `NotificationLog`.
- **Customer phone OTP** — `REQUIRE_PHONE_OTP=true|false`. If you deploy without a real SMS provider, set it to `false` (otherwise customers can't receive codes).
- **Images** — Cloudinary (`CLOUDINARY_*`) for production. Without it, uploads go to `./.uploads` (dev / self-hosted only; serverless hosts like Vercel have no persistent disk and the upload endpoint will say so).
- **Maps** — no key required: tracking uses an OpenStreetMap embed, navigation uses Google Maps directions links, reverse geocoding uses Nominatim. Set `GOOGLE_MAPS_API_KEY` to use Google Geocoding instead.

## Deploy (Vercel + Neon/Supabase)

1. Create a Postgres database (Neon or Supabase) and copy its connection string.
2. Push this repo to GitHub, import it in Vercel and set **Root Directory = `demodash`**.
3. Add the environment variables from `.env.example` (at least `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `CLOUDINARY_*`, SMTP/SMS settings).
4. Apply the committed migrations to the production DB: `DATABASE_URL=... npx prisma migrate deploy`. Then `DATABASE_URL=... npm run db:seed` — **then immediately change the seeded passwords** (Admin → Team → Reset password) or delete the seeded users after creating your own.
5. Deploy. The build runs `prisma generate && next build`.

Self-hosting works too: `npm run build && npm start` behind a reverse proxy (set `UPLOAD_LOCAL=true` to allow local image storage in production).

## Security notes

- Passwords hashed with bcrypt; sessions are signed JWTs in an httpOnly, SameSite=Lax cookie; role is enforced in middleware, in every route handler and in layouts, and active status is re-checked in the DB on each request.
- Customer phone/email are **never returned by public endpoints**. Tracking is by an unguessable booking code (`DD-` + 8 random chars); the handover OTP is shown only to the booking holder, and the delivery API never returns it.
- Rate limits: bookings (per IP + per phone), OTP send/verify, login (per IP + per account), OTP-at-door attempts, tracking lookups. The limiter is **in-memory** — fine for one instance; on Vercel swap `lib/rate-limit.ts` for Upstash Redis.
- Inputs validated with zod; uploads are size/type checked by magic bytes.

## Known MVP limitations / next steps

- **Live tracking is polling-based** (customer page polls every 5 s, rider posts GPS every ≥10 s) rather than Socket.IO/Supabase Realtime — simpler and Vercel-friendly. The rider's browser must stay open with location permission granted. ETA is a straight-line estimate, not a routed ETA.
- Admin dashboard "real-time" alerts are 8-second polling + toast (plus the email/SMS alert).
- Delivery photo is a URL field set when creating the account (no photo upload UI yet).
- Customer schedule slots are generated in the browser's timezone (assumed to be the shop's).
- No automated unit tests yet beyond `scripts/smoke-test.sh`.
- Not in scope (by design): payments, cart/checkout, multi-vendor, other product categories' demo flows.
