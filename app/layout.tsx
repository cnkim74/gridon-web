import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import "./globals.css";
import "./pages.css";
import SiteScripts from "@/components/SiteScripts";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gridon.example.com"),
  title: {
    default: "GRIDON · 그리드온 — Where the Grid turns On.",
    template: "%s · GRIDON 그리드온",
  },
  description:
    "전력망이 깨어나는 그 순간. 그리드온은 전력공급·스마트그리드·신재생/ESS·전기공사를 아우르는 종합 전력회사입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${archivo.variable} ${spaceMono.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable.css"
        />
      </head>
      <body>
        {children}
        <SiteScripts />
      </body>
    </html>
  );
}
