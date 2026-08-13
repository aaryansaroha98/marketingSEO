import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketPilot AI — Your autonomous growth team",
  description: "Plan, create, publish, rank, and convert from one intelligent marketing workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
