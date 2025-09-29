import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OpenCodeProvider } from "@/contexts/OpenCodeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "opencode web",
  description: "A web-based IDE for opencode projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-webtui-theme="catppuccin-mocha"
      className="antialiased"
    >
       <body
         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
       >
         <OpenCodeProvider>
           {children}
         </OpenCodeProvider>
       </body>
    </html>
  );
}
