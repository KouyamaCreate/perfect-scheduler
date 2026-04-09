import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthDebug } from "@/components/AuthDebug";
import { FirebaseConfigDebug } from "@/components/FirebaseConfigDebug";
import { ClientOnly } from "@/components/ClientOnly";

export const metadata: Metadata = {
  title: "Meetrace",
  description: "なぞって予定を重ね、会える時間をすばやく見つけるスケジュール調整サービス",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
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
