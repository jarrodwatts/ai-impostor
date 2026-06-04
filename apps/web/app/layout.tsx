import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const brittiSans = localFont({
  src: "./fonts/britti-sans-variable.woff2",
  variable: "--font-britti-sans",
  display: "swap",
  preload: true,
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-impostor-rose.vercel.app"),
  title: "Agents Among Us",
  description:
    "Some of you aren't human. A fast, live social-deduction game — share a chat with hidden AI agents and vote them out before the round ends. Built on Monad.",
  applicationName: "Agents Among Us",
  // Icons (icon.png / apple-icon.png) and the social card (opengraph-image.png /
  // twitter-image.png) are auto-wired by Next from the matching files in app/.
  openGraph: {
    type: "website",
    siteName: "Agents Among Us",
    url: "/",
    title: "Agents Among Us",
    description:
      "Some of you aren't human. Spot the hidden AI agents in the chat before the round ends.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agents Among Us",
    description:
      "Some of you aren't human. Spot the hidden AI agents in the chat before the round ends.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E100F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${robotoMono.variable} ${brittiSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
