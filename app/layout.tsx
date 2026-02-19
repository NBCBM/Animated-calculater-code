import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VidRush - AI Video Creation Platform",
  description:
    "Create stunning AI-powered videos in minutes. From idea to polished video with AI scripting, stock footage, narration, and assembly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
