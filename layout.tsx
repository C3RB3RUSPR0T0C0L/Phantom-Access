import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable:"--font-sans", subsets:["latin"] });
const mono = Geist_Mono({ variable:"--font-mono", subsets:["latin"] });

export const metadata: Metadata = {
  title:"Phantom Access",
  description:"An interactive cloud identity attack and Zero Trust defense lab.",
  other:{"codex-preview":"development"},
  icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"},
};

export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>; }
