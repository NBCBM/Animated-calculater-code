"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Describe Your Video",
    description: "Enter your topic and choose format, duration, and style.",
  },
  {
    number: "02",
    title: "AI Generates Script",
    description: "AI creates a complete script with scenes, narration, and visual cues.",
  },
  {
    number: "03",
    title: "Review & Customize",
    description: "Edit scenes, swap media, pick voices, and fine-tune every detail.",
  },
  {
    number: "04",
    title: "Export Your Video",
    description: "Render and download your polished video with one click.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent" />
      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-foreground/60 max-w-lg mx-auto">
            Four simple steps from idea to finished video.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-foreground/50">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[52%] w-16 h-px bg-gradient-to-r from-accent/30 to-transparent" style={{ left: `calc(${(i + 1) * 25}% - 32px)` }} />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
