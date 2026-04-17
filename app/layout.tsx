import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import RouteGuard from "@/components/RouteGuard";

export const metadata: Metadata = {
  title: "Nestco — Student Subletting at UC Berkeley",
  description: "Find or list student sublets at UC Berkeley. Verified by .edu email, powered by AI search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <RouteGuard>{children}</RouteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
