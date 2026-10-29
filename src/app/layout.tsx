import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "号码标记查 — 多平台标记查询与申诉指引",
  description:
    "查询手机号在腾讯、360、电话邦等平台的标记情况，并跳转至官方申诉页面。本服务不代申诉、不承诺取消标记。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <Suspense
          fallback={
            <header className="sticky top-0 z-40 h-14 border-b bg-background/95" />
          }
        >
          <SiteHeader />
        </Suspense>
        <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-5xl px-4 py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
