import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Building2,
  Percent,
  TrendingUp,
  IdCard,
  QrCode,
  Zap,
  Smartphone,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />

      {/* Hero — one composition */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pb-24">
          <div className="animate-fade-up space-y-6 text-center lg:text-left">
            <h1 className="font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
              Accept digital payments.
              <br />
              <span className="text-gold-dark">No card machine needed.</span>
            </h1>
            <p className="mx-auto max-w-md text-lg text-muted lg:mx-0">
              Sign up with your ID and phone. Start accepting PayShap payments in
              under 2 minutes.
            </p>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/register">
                <Button size="lg" fullWidth className="sm:w-auto">
                  Get started free
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" fullWidth className="sm:w-auto">
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative mx-auto w-full max-w-[280px] animate-float lg:max-w-[300px]">
            <div className="absolute -inset-8 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative rounded-[2rem] border-[6px] border-ink bg-ink p-2 shadow-2xl shadow-ink/30">
              <div className="overflow-hidden rounded-[1.5rem] bg-cream">
                <div className="bg-gold px-4 py-6 text-center">
                  <p className="text-xs font-medium text-ink/70">Accept Payment</p>
                  <p className="mt-2 font-heading text-4xl font-bold text-ink">
                    R150.00
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border-2 border-gold bg-gold/10 p-3 text-center">
                      <QrCode className="mx-auto h-6 w-6 text-gold-dark" />
                      <p className="mt-1 text-xs font-semibold">QR Code</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3 text-center opacity-70">
                      <Smartphone className="mx-auto h-6 w-6 text-muted" />
                      <p className="mt-1 text-xs font-semibold">Phone</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center rounded-xl bg-white p-4">
                    <div className="grid h-28 w-28 grid-cols-5 gap-0.5">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-[1px] ${
                            [0, 1, 2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23, 24].includes(i)
                              ? "bg-ink"
                              : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-xs text-muted animate-pulse-soft">
                    Waiting for payment…
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border/60 bg-white/50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center font-heading text-3xl font-bold text-ink sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted">
            Three steps from signup to your first payment.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: IdCard,
                step: "1",
                title: "Sign up with your SA ID + selfie",
                desc: "We verify it’s really you — no paperwork, no bank visit.",
              },
              {
                icon: QrCode,
                step: "2",
                title: "Show your QR or share your number",
                desc: "Customer scans or gets a PayShap request on their phone.",
              },
              {
                icon: Zap,
                step: "3",
                title: "Customer pays — money arrives instantly",
                desc: "Settled on SA’s real-time PayShap rail, not slow cards.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center sm:text-left">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark sm:mx-0">
                  <item.icon className="h-7 w-7" />
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-gold-dark">
                  Step {item.step}
                </p>
                <h3 className="mt-1 font-heading text-lg font-bold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Imali Pay */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center font-heading text-3xl font-bold text-ink sm:text-4xl">
            Why Imali Pay
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted">
            Built for spaza shops, street vendors, and market stalls.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: CreditCard,
                title: "No card machine",
                desc: "Your phone is enough. Accept payments wherever you trade.",
              },
              {
                icon: Building2,
                title: "No business bank account needed",
                desc: "Sign up with your SA ID and personal phone number.",
              },
              {
                icon: Percent,
                title: "Fraction of card fees",
                desc: "PayShap costs far less than the 2.75–2.95% card schemes charge.",
              },
              {
                icon: TrendingUp,
                title: "Builds your financial history",
                desc: "Every sale strengthens your verified turnover and unlocks higher limits.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-[14px] border border-border/80 bg-white/80 p-5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green/10 text-green">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t border-border/60 bg-gold/10 py-14">
        <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
            Ready to get paid digitally?
          </h2>
          <p className="mt-2 text-muted">Free to start. Under 2 minutes to go live.</p>
          <Link href="/register" className="mt-6 inline-block">
            <Button size="lg">Get started free</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo size="sm" />
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Imali Pay. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
