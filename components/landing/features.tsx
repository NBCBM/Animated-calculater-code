"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, Image, Mic, Film } from "lucide-react";

const features = [
  {
    icon: <FileText className="h-6 w-6" />,
    title: "AI Script Writing",
    description:
      "Describe your topic and AI generates a complete scene-by-scene script with narration and visual cues.",
    color: "text-accent-light bg-accent/10",
  },
  {
    icon: <Image className="h-6 w-6" />,
    title: "Smart Media Matching",
    description:
      "Automatically finds high-quality stock footage and images from Pexels that match each scene.",
    color: "text-purple bg-purple/10",
  },
  {
    icon: <Mic className="h-6 w-6" />,
    title: "Auto Narration",
    description:
      "Professional AI voiceover using OpenAI's text-to-speech with multiple voice options.",
    color: "text-success bg-success/10",
  },
  {
    icon: <Film className="h-6 w-6" />,
    title: "One-Click Assembly",
    description:
      "Canvas-based video rendering with Ken Burns effects, transitions, and subtitles. Download as WebM.",
    color: "text-warning bg-warning/10",
  },
];

export function Features() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="gradient-text">Create Videos</span>
          </h2>
          <p className="text-foreground/60 max-w-xl mx-auto">
            A full AI creative pipeline from script to final video, all running in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card hover className="h-full">
                <div className={`inline-flex p-3 rounded-xl mb-4 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-foreground/60">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
