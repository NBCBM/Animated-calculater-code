"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Film, ListOrdered } from "lucide-react";

export function Formats() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Choose Your <span className="gradient-text">Format</span>
          </h2>
          <p className="text-foreground/60 max-w-lg mx-auto">
            Two proven video formats to match your content needs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card hover className="h-full text-center">
              <div className="inline-flex p-4 rounded-2xl bg-accent/10 mb-4">
                <Film className="h-8 w-8 text-accent-light" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Documentary</h3>
              <p className="text-sm text-foreground/60 mb-4">
                In-depth exploration of a topic with narrative flow. Great for educational
                content, explainers, and story-driven videos.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["1-2 min", "3-5 min", "8-10 min"].map((d) => (
                  <span key={d} className="px-3 py-1 rounded-full bg-white/5 text-xs text-foreground/50">
                    {d}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card hover className="h-full text-center">
              <div className="inline-flex p-4 rounded-2xl bg-purple/10 mb-4">
                <ListOrdered className="h-8 w-8 text-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Top 10 / Listicle</h3>
              <p className="text-sm text-foreground/60 mb-4">
                Numbered list format with ranked items. Perfect for countdowns,
                comparisons, and highly engaging clickable content.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["3-8 items", "5-10 items", "10-15 items"].map((d) => (
                  <span key={d} className="px-3 py-1 rounded-full bg-white/5 text-xs text-foreground/50">
                    {d}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
