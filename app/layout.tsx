import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "To-Do Agent",
  description: "AI-powered action item aggregator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
