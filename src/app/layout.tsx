import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthHeader } from "@/components/AuthHeader";
import { AuthDebug } from "@/components/AuthDebug";
import { FirebaseConfigDebug } from "@/components/FirebaseConfigDebug";
import { ClientOnly } from "@/components/ClientOnly";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perfect Scheduler",
  description: "スケジュール調整を簡単に、美しく行うためのウェブアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AuthHeader />
          {children}
          <ClientOnly>
            <AuthDebug />
            <FirebaseConfigDebug />
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  );
}
