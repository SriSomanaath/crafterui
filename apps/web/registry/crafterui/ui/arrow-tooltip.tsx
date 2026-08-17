"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

/**
 * Wraps the app (or a subtree) so tooltips can be used inside it.
 * `delayDuration` controls how long the pointer must rest before the tooltip opens.
 */
function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="arrow-tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

/**
 * Root tooltip. Self-provides a `TooltipProvider`, so it can be dropped in
 * anywhere without manual provider setup.
 */
function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="arrow-tooltip" {...props} />
    </TooltipProvider>
  )
}

/**
 * The element that opens the tooltip on hover/focus. Use `asChild` to merge
 * the trigger behaviour onto your own element.
 */
function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return (
    <TooltipPrimitive.Trigger data-slot="arrow-tooltip-trigger" {...props} />
  )
}

/**
 * Floating tooltip panel with the signature outlined "border arrow" pointer
 * that stays seamlessly connected to the panel's outline on every side.
 */
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="arrow-tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-background text-foreground outline-border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 group z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance outline-1",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow asChild>
          <span>
            <ArrowSvg />
          </span>
        </TooltipPrimitive.Arrow>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

const ArrowSvg = (props: React.ComponentProps<"svg">) => (
  <svg
    width="20"
    height="10"
    viewBox="0 0 20 10"
    fill="none"
    className="-mt-px ml-px"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M10.3356 7.39793L15.1924 3.02682C15.9269 2.36577 16.8801 2 17.8683 2H20V0H0V2H1.4651C2.4532 2 3.4064 2.36577 4.1409 3.02682L8.9977 7.39793C9.378 7.7402 9.9553 7.74021 10.3356 7.39793Z"
      fill="var(--color-background)"
    />
    <path
      d="M11.1363 8.14124C10.3757 8.82575 9.22111 8.82578 8.46041 8.14122L3.60361 3.77011C3.05281 3.27432 2.33791 2.99999 1.59681 2.99999L4.24171 3L9.12941 7.39793C9.50971 7.7402 10.087 7.7402 10.4674 7.39793L15.3544 3L18 2.99999C17.2589 2.99999 16.544 3.27432 15.9931 3.77011L11.1363 8.14124Z"
      fill="var(--color-background)"
    />
    <path
      d="M9.6667 6.65461L14.5235 2.28352C15.4416 1.45721 16.6331 1 17.8683 1H20V2H17.8683C16.8801 2 15.9269 2.36577 15.1924 3.02682L10.3356 7.39793C9.9553 7.74021 9.378 7.7402 8.9977 7.39793L4.1409 3.02682C3.4064 2.36577 2.4532 2 1.4651 2H0V1H1.4651C2.7002 1 3.8917 1.45722 4.8099 2.28352L9.6667 6.65461Z"
      fill="var(--color-border)"
    />
  </svg>
)

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
