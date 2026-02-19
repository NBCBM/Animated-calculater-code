"use client";

import { Header } from "@/components/layout/header";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Formats } from "@/components/landing/formats";
import { CTA } from "@/components/landing/cta";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Formats />
        <CTA />
      </main>
      <footer className="py-8 text-center text-xs text-foreground/30 border-t border-border/30">
        <p>VidRush Clone - AI Video Creation Platform. Stock footage by Pexels. AI by OpenAI.</p>
      </footer>
    </>
  );
}
