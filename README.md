# Imali Pay

Digital payments for informal traders in South Africa. Accept PayShap payments with SA ID + phone — no card machine, no business bank account.

## Quick start (demo)

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo login

- Phone: `0821234567`
- OTP: shown on screen in demo mode (also logged in the terminal)

## Deploy (Netlify)

1. Connect the GitHub repo `Gift404/hackathon` in the [Netlify dashboard](https://app.netlify.com)
2. Build command: `npx prisma generate && next build` (already in `netlify.toml`)
3. Set environment variables (see `.env.example`), especially:
   - `DATABASE_URL` — PostgreSQL connection string
   - `DEMO_MODE=true`
   - `NEXT_PUBLIC_DEMO_MODE=true`
   - `NEXTAUTH_SECRET` — any long random string
   - `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` — your Netlify URL
4. Deploy, then run seed once against production DB: `DATABASE_URL=... npm run db:seed`

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Zustand, React Hook Form + Zod, Recharts, qrcode.react, Sonner
- Hosting: Netlify