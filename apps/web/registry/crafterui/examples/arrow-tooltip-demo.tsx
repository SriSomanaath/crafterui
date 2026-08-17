"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/crafterui/ui/arrow-tooltip"

const triggerClassName =
  "text-muted-foreground hover:text-foreground cursor-default text-lg font-medium transition-colors"

export default function ArrowTooltipDemo() {
  return (
    <div className="flex w-full items-center justify-center py-12">
      <div className="grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-x-20 gap-y-14">
        <div className="col-start-2 row-start-1">
          <Tooltip>
            <TooltipTrigger className={triggerClassName}>Top</TooltipTrigger>
            <TooltipContent side="top">
              <p>Tooltip on top</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="col-start-1 row-start-2">
          <Tooltip>
            <TooltipTrigger className={triggerClassName}>Left</TooltipTrigger>
            <TooltipContent side="left">
              <p>Tooltip on left</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="col-start-3 row-start-2">
          <Tooltip>
            <TooltipTrigger className={triggerClassName}>Right</TooltipTrigger>
            <TooltipContent side="right">
              <p>Tooltip on right</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="col-start-2 row-start-3">
          <Tooltip>
            <TooltipTrigger className={triggerClassName}>Bottom</TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Tooltip on bottom</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
