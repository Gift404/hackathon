# EZIPAY

Digital payments for informal traders in South Africa. Accept PayShap payments with SA ID + phone — no card machine, no business bank account.

## Live demo

- **Primary (working):** https://imalipay.netlify.app  
- **Alternate name:** https://ezipay.netlify.app — currently returns API 404s; use Imali Pay for demos.

## Quick start (demo)

```bash
cp .env.example .env   # set SESSION_SECRET (≥32 chars) + DATABASE_URL
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo login

- Phone: `0821234567`
- OTP: shown on screen in demo mode (also logged in the terminal)

## What is real vs mocked

| Piece | Demo (`DEMO_MODE=true`) | Live (`DEMO_MODE=false` + keys) |
|---|---|---|
| OTP SMS | Twilio **and** on-screen code when `DEMO_MODE=true` | Twilio only (no on-screen code) |
| SA ID | Smile **mock** | Smile Enhanced KYC (`/v1/id_verification`) |
| Liveness | 3s mock | Camera selfie + server image validation (SmartSelfie Web SDK for full anti-spoof) |
| PayShap QR | Stitch **mock** + Simulate button | GraphQL QR + webhook |
| Pay by phone | SMS PIN to customer **+** on-screen PIN in demo → trader confirms | SMS PIN only (gateway later) |
| Sessions | HMAC-signed httpOnly cookie | Same (`SESSION_SECRET`) |
| Money | Integer **cents** in Postgres | Same |

## Security hardening

- Signed session cookies (HMAC) — not raw trader IDs
- OTPs stored as salted hashes; send/verify rate-limited
- Liveness requires an authenticated session
- Daily limits are cumulative (completed + pending) for QR and phone
- Stitch webhooks: `X-Stitch-Signature: t=...,hmac_sha256=...` over `t.body`
- SA ID masked in dashboard API responses

## Live Stitch checklist

1. Create a Stitch client with `client_paymentrequest` scope
2. Set `STITCH_CLIENT_ID`, `STITCH_CLIENT_SECRET`, `STITCH_WEBHOOK_SECRET`
3. Set `NEXT_PUBLIC_APP_URL` to your deployed origin
4. Subscribe webhook to `POST {APP_URL}/api/webhook/stitch`
5. Set `DEMO_MODE=false` and `NEXT_PUBLIC_DEMO_MODE=false`
6. Create QR / phone request — customer completes bank UI; webhook or status poll settles

## Deploy (Netlify)

1. Connect the GitHub repo in the [Netlify dashboard](https://app.netlify.com)
2. Build command: `npx prisma generate && next build` (already in `netlify.toml`)
3. Set environment variables (see `.env.example`), especially:
   - `DATABASE_URL` — PostgreSQL (claim free Prisma DB instances before they expire)
   - `SESSION_SECRET` — long random string (≥32 chars)
   - `DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE` — `true` for judge demos
   - `NEXT_PUBLIC_APP_URL` — your live Netlify URL (e.g. `https://….netlify.app`)
   - `NEXT_PUBLIC_APP_NAME=EZIPAY`
4. Deploy, then seed once against production: `DATABASE_URL=... npm run db:seed`
5. Confirm `/api/health` returns ok on the live site

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL (integer cents for money)
- Zustand, React Hook Form + Zod, qrcode.react, Sonner
- Hosting: Netlify
