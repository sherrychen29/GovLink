import type { Metadata, Viewport } from "next";
import { Monda, Noto_Sans } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const monda = Monda({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-monda",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GovLink",
    template: "%s · GovLink",
  },
  description:
    "GovLink connects city residents with their local government to report and resolve everyday civic issues — potholes, broken streetlights, water leaks and more.",
};

export const viewport: Viewport = {
  themeColor: "#0b2447",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${monda.variable} ${notoSans.variable}`}>
      <body className="min-h-screen bg-slate-50">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
