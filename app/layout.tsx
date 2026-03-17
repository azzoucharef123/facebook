import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap"
});

export const metadata: Metadata = {
  title: "FB Comment Bot Manager",
  description: "Manage a Facebook Page comment bot with a secure dashboard and Railway-ready worker."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.variable + " font-sans text-slate-100 antialiased"}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
