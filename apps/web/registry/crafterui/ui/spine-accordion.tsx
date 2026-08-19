"use client"

// A shelf of work you open one piece at a time.
//
// Closed, every project is a spine: a hairline column with its name set
// bottom-to-top along the edge, the way a title runs down the side of a book on
// a shelf. Point at one and it unfurls - the spine slides open into a framed
// picture and the art fades up inside it while everything else closes back to a
// hairline.
//
// The whole layout is one animated length: flex-basis. A closed panel asks for
// one spine's thickness, the open one asks for the entire shelf, and flex
// settles the overshoot by shrinking everybody in proportion - which, with the
// spines floored at their own thickness, hands the open panel every pixel the
// others do not need. The shelf therefore fits four pieces or twenty with no
// measurement and no per-count tuning, and the same rule stacks it into rows in
// a narrow container, because flex-basis follows the main axis whichever way it
// happens to point.
import * as React from "react"

import { cn } from "@/lib/utils"

export interface SpineAccordionItem {
  /** Project name, set along the spine. Also names the panel for a11y. */
  title: string
  /** Art revealed when the panel opens. Any src an <img> takes. */
  image: string
  /** Sits at the far end of the spine, e.g. a year range. @default undefined */
  meta?: string
}

export interface SpineAccordionProps
  extends Omit<
    React.ComponentPropsWithoutRef<"section">,
    "children" | "onChange"
  > {
  /** Pieces, in shelf order. */
  items: SpineAccordionItem[]
  /** Open panel when controlled. Leave unset for internal state. @default undefined */
  index?: number
  /** Open panel on mount when uncontrolled. @default 0 */
  defaultIndex?: number
  /** Fires on every change, from pointer, tap or keyboard focus. @default undefined */
  onIndexChange?: (index: number) => void
  /**
   * Thickness of a closed spine - its width in a row, its height in a stack.
   * Any CSS length; also sets the gutter the open panel's art is inset by.
   * @default "4rem"
   */
  spine?: string
}

export function SpineAccordion({
  items,
  index,
  defaultIndex = 0,
  onIndexChange,
  spine = "4rem",
  className,
  ...props
}: SpineAccordionProps) {
  const [internal, setInternal] = React.useState(defaultIndex)
  const open = index ?? internal

  const select = React.useCallback(
    (next: number) => {
      if (index === undefined) setInternal(next)
      onIndexChange?.(next)
    },
    [index, onIndexChange]
  )

  return (
    // Sized by its container, not the viewport: @container means the shelf
    // stacks and re-types itself off its own width, so it behaves the same in a
    // page column as it does full bleed.
    <section
      className={cn(
        "@container bg-background text-foreground relative h-full min-h-[24rem] w-full overflow-hidden select-none",
        className
      )}
      style={{ "--spine": spine } as React.CSSProperties}
      {...props}
    >
      <div className="flex h-full w-full flex-col overflow-y-auto @3xl:flex-row @3xl:overflow-y-visible">
        {items.map((item, i) => {
          const isOpen = i === open
          return (
            <button
              key={item.title}
              type="button"
              aria-expanded={isOpen}
              onClick={() => select(i)}
              onFocus={() => select(i)}
              onPointerEnter={(event) => {
                // Hover opens - but only under a mouse. On touch the enter
                // event arrives with the tap that is already selecting, and a
                // stylus fires it from a hover the reader never meant.
                if (event.pointerType === "mouse") select(i)
              }}
              style={{ flexBasis: isOpen ? "100%" : "var(--spine)" }}
              className={cn(
                "border-border relative min-h-[var(--spine)] min-w-[var(--spine)] shrink cursor-pointer border-b text-left outline-none transition-[flex-basis] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] last:border-0",
                "focus-visible:outline-foreground focus-visible:-outline-offset-2 focus-visible:outline-2",
                "motion-reduce:transition-none",
                "@3xl:border-r @3xl:border-b-0"
              )}
            >
              {/* Mounted in every panel and merely transparent while closed, so
                  unfurling cross-fades a picture the browser already decoded
                  rather than starting a fetch the reader waits on. */}
              <span
                className={cn(
                  "bg-muted absolute inset-x-3 top-[var(--spine)] bottom-3 block transition-opacity duration-700 motion-reduce:transition-none",
                  "@3xl:inset-y-3 @3xl:top-3 @3xl:right-3 @3xl:left-[var(--spine)]",
                  isOpen ? "opacity-100" : "opacity-0"
                )}
              >
                <img
                  src={item.image}
                  alt=""
                  draggable={false}
                  className="size-full object-cover"
                />
              </span>

              {/* The spine. Stretched to the panel's full height so the title
                  can sit at one end and the year at the other, then turned on
                  its side by writing-mode - which keeps the text in normal flow
                  and costs no height measurement, where a rotate would. */}
              <span
                className={cn(
                  "absolute inset-x-4 top-4 flex items-start justify-between gap-3 overflow-hidden transition-colors duration-500",
                  "@3xl:inset-x-auto @3xl:inset-y-4 @3xl:left-4 @3xl:flex-col-reverse @3xl:gap-0",
                  "motion-reduce:transition-none",
                  isOpen ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="truncate text-base font-medium tracking-tight @3xl:overflow-visible @3xl:rotate-180 @3xl:text-lg @3xl:[writing-mode:vertical-rl] @5xl:text-xl">
                  {item.title}
                </span>
                {item.meta ? (
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums transition-opacity duration-500 @3xl:rotate-180 @3xl:text-sm @3xl:[writing-mode:vertical-rl] motion-reduce:transition-none",
                      isOpen ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {item.meta}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
