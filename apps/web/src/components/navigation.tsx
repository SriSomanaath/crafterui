import Link from "next/link";
import { ArrowLeftIcon } from "../lib/icons";
import { AnimatedThemeToggler } from "@/registry/crafterui/ui/theme-toggle";

// The navbar toggle is the registry's own theme-toggle, stripped of its filled
// pill so it sits as a quiet icon beside the GitHub link. The circle wipe and
// the reduced-motion fallback come with it.
export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <AnimatedThemeToggler
      variant="circle-blur"
      className={`size-auto rounded-none border-0 bg-transparent text-muted-foreground hover:text-foreground transition-colors ${className}`}
    />
  );
}

export function BackLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm ${className}`}
    >
      <ArrowLeftIcon />
      {label}
    </Link>
  );
}

export function Divider({ delay = 0, className = "mb-10" }: { delay?: number; className?: string }) {
  return (
    <div
      className={`w-full h-px bg-[linear-gradient(90deg,transparent_2px,var(--border)_2px,transparent_4px)] bg-[length:4px_1px] animate-fade-in ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
