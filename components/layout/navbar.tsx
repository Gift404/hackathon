"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#how-it-works"
            className="text-sm font-medium text-ink/70 hover:text-ink transition-colors"
          >
            How it works
          </a>
          <Link
            href="/login"
            className="text-sm font-medium text-ink/70 hover:text-ink transition-colors"
          >
            Sign in
          </Link>
          <Link href="/register">
            <Button size="sm">Get started free</Button>
          </Link>
        </nav>
        <button
          className="md:hidden min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl hover:bg-ink/5"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-cream px-4 py-4 md:hidden animate-fade-up">
          <div className="flex flex-col gap-3">
            <a
              href="#how-it-works"
              className="min-h-[48px] flex items-center text-ink font-medium"
              onClick={() => setOpen(false)}
            >
              How it works
            </a>
            <Link
              href="/login"
              className="min-h-[48px] flex items-center text-ink font-medium"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <Button fullWidth>Get started free</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
