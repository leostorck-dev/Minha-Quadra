import type { Metadata } from "next";
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
  title: {
    default: "Minha Quadra | Gestão de arenas esportivas",
    template: "%s | Minha Quadra",
  },
  description:
    "Centralize agenda, clientes, pagamentos manuais e financeiro da sua arena esportiva em um só lugar.",
  applicationName: "Minha Quadra",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Minha Quadra",
    title: "Minha Quadra | Gestão de arenas esportivas",
    description:
      "Agenda, clientes, pagamentos manuais e financeiro em um só lugar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Minha Quadra | Gestão de arenas esportivas",
    description:
      "Agenda, clientes, pagamentos manuais e financeiro em um só lugar.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
