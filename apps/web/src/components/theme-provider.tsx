"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// The site chrome is light; this exists so the registry's theme-toggle has a
// real theme to flip, and so every component's `dark:` styling resolves against
// an explicit .dark class rather than the visitor's OS setting.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
