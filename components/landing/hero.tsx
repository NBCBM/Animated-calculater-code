"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/20 rounded-full blur-[128px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple/20 rounded-full blur-[128px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-sm mb-8">
            <Sparkles className="h-4 w-4" />
            AI-Powered Video Creation
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
        >
          Create Stunning Videos{" "}
          <span className="gradient-text">in Minutes</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto mb-10"
        >
          From idea to polished video. AI writes your script, finds matching footage,
          adds narration, and assembles everything automatically.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/create">
            <Button size="lg" className="text-base px-8">
              <Play className="h-5 w-5" />
              Start Creating
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="secondary" size="lg" className="text-base px-8">
              View Projects
            </Button>
          </Link>
        </motion.div>

        {/* Floating studio preview card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 mx-auto max-w-2xl"
        >
          <div className="glass p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-danger/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="text-xs text-foreground/40 ml-2">VidRush Studio</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 rounded-lg bg-surface h-40 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-2">
                    <Play className="h-6 w-6 text-accent-light" />
                  </div>
                  <p className="text-xs text-foreground/40">Video Preview</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-surface p-3">
                  <div className="skeleton h-2 w-full mb-2" />
                  <div className="skeleton h-2 w-3/4" />
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <div className="skeleton h-2 w-full mb-2" />
                  <div className="skeleton h-2 w-1/2" />
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <div className="skeleton h-2 w-full mb-2" />
                  <div className="skeleton h-2 w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
