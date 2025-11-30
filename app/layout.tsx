import "./globals.css";
import { auth } from "@/auth";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import Header from "@/components/Header";
import { ToastContainer } from "@/components/Toast";
import AdminSetupGate from "@/components/AdminSetupGate";

export const metadata: Metadata = {
  title: "Secret Santa Manager",
  description: "Multi-tirages Secret Santa avec emails",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="fr">
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <Providers session={session}>
          <AdminSetupGate>
            <Header />
            <main className="mx-auto max-w-5xl px-4 py-4 sm:py-8">{children}</main>
            <ToastContainer />
          </AdminSetupGate>
        </Providers>
      </body>
    </html>
  );
}