"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "../lib/icons";

// Showcase header: the page scans as title then playground; the description
// folds out of "See more" (accordion via a 0fr→1fr grid, nothing measured). On
// a solo detail page it opens by default.
export function ShowcaseIntro({
  title,
  delay = 0,
  defaultOpen = false,
  children,
}: {
  title: string;
  delay?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="animate-fade-in mb-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between gap-4">
        {/* The page's top heading: h1 from the document outline, sized via CSS
            to stay quiet (the demo is the hero, not the title). */}
        <h1 className="text-sm font-medium tracking-tight text-foreground">{title}</h1>
        <button
          type="button"
          className="relative flex-none inline-flex items-center gap-1 px-2 py-1 -mr-2 rounded-full text-xs font-medium text-muted-foreground [transition:color_200ms_ease,background-color_200ms_ease,scale_150ms_ease-out] hover:text-foreground hover:bg-muted active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground after:content-[''] after:absolute after:-inset-y-2 after:inset-x-0"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "See less" : "See more"}
          <span
            className={`inline-flex [transition:rotate_250ms_var(--ease-smooth-out)] ${open ? "rotate-180" : "rotate-0"}`}
          >
            <ChevronDownIcon />
          </span>
        </button>
      </div>
      <div
        className="group/intro grid grid-rows-[0fr] [transition:grid-template-rows_400ms_var(--ease-smooth-out)] data-[open=true]:grid-rows-[1fr]"
        data-open={open ? "true" : "false"}
        id={id}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="text-muted-foreground text-sm leading-relaxed pt-2 text-pretty opacity-0 [transform:translateY(-0.25rem)] blur-[2px] [transition:opacity_350ms_var(--ease-smooth-out),transform_350ms_var(--ease-smooth-out),filter_350ms_var(--ease-smooth-out)] group-data-[open=true]/intro:opacity-100 group-data-[open=true]/intro:[transform:translateY(0)] group-data-[open=true]/intro:blur-[0px]">
            {children}
          </p>
        </div>
      </div>
    </div>
  );
}
