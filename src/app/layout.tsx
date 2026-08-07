import type { Metadata } from "next";
import { mbfDisplay, mbfSans, mbfMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Biz Flow",
  description: "Modular, no-code, multi-vertical business & CRM platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mbfDisplay.variable} ${mbfSans.variable} ${mbfMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
