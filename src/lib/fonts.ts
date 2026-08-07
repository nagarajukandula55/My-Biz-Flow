import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

// MBF Display — headings, wordmark, topbar titles, sidebar brand only.
export const mbfDisplay = Archivo({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

// MBF Sans — default UI font for all interface text.
export const mbfSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// MBF Mono — tabular figures: amounts, IDs, stats.
export const mbfMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});
