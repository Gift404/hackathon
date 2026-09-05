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

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite (swap to PostgreSQL for production)
- Zustand, React Hook Form + Zod, Recharts, qrcode.react, Sonner

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed Nomsa demo trader + 30 days of transactions |
| `npm run db:studio` | Open Prisma Studio |

## Demo flow

1. Landing → Get started / Sign in as Nomsa
2. Dashboard shows today’s earnings + tier + score
3. Tap **+** → enter R150 → QR or phone request
4. Tap **Simulate payment** → green success screen

## Environment

Copy `.env.example` to `.env`. With `DEMO_MODE=true`, Stitch, Smile Identity, and Twilio are mocked.

For production PostgreSQL: set `provider = "postgresql"` in `prisma/schema.prisma` and update `DATABASE_URL`.
