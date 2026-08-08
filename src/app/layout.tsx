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
      <head>
        {/* Applies a saved light/dark choice (see ThemeToggle) before first
            paint, so there's no flash of the wrong theme on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("mbf-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
