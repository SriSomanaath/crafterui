import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/src/components/theme-provider";
import "./globals.css";

const title = "crafterui - Less is more";
const description =
  "A collection of Open Source motion and interaction components that you can customize, extend, and build on. React + Tailwind, on the shadcn registry - copy the source or install with npx @crafterui/cli.";

export const metadata: Metadata = {
  metadataBase: new URL("https://crafterui.dev"),
  title: {
    default: title,
    template: "%s | crafterui",
  },
  description,
  authors: [{ name: "crafterui", url: "https://crafterui.dev" }],
  creator: "crafterui",
  keywords: [
    "crafterui",
    "crafterui",
    "shadcn",
    "react components",
    "tailwind",
    "ui",
    "motion",
    "animation",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "crafterui",
    title,
    description,
    images: [{ url: "/og", width: 1200, height: 630, alt: "crafterui" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@crafterui",
    creator: "@crafterui",
    title,
    description,
    images: ["/og"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
