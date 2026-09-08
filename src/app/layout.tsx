import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://waiverops.com"),
  title: {
    default: "Waiver Ops",
    template: "%s | Waiver Ops",
  },
  description:
    "League-aware fantasy football recommendations backed by cross-source player intelligence.",
  openGraph: {
    type: "website",
    siteName: "Waiver Ops",
    title: "Waiver Ops",
    description:
      "League-aware fantasy football recommendations backed by cross-source player intelligence.",
    url: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f5f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
