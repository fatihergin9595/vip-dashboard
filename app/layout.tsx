// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./_components/SiteHeader";

// Font setup
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata
export const metadata: Metadata = {
  title: "VIP Takip Sistemi",
  description: "VIP üyeler ve finansal raporlama sistemi",
};

// Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-vip-bg text-white`}
      >
        <Header />
        {/* Header yüksekliğini zaten padding ile çözdük, ekstra boşluk yok */}
        <main>{children}</main>
      </body>
    </html>
  );
}