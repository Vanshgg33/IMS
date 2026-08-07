import type { Metadata } from "next";
import { Lato, Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NatureLite IMS",
  description: "Inventory Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${playfair.variable} ${ibmPlexMono.variable}`}>
      <body className={lato.className}>
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-up">{children}</main>
      </body>
    </html>
  );
}
