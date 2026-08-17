# Super Hover

Headless cursor hit-testing engine: tracks which element is under the pointer frame-by-frame, so hover keeps following the cursor even while the list scrolls beneath it. Ships as a controller plus React hooks, no UI.

- Install: `npx @crafterui/cli@latest components add super-hover` - or `npx shadcn@latest add https://crafterui.dev/r/super-hover.json`
- Installs to: `registry/crafterui/ui/super-hover.tsx`

## Source - `registry/crafterui/ui/super-hover.tsx`

```tsx
"use client"

// Inspired by Super Hover by Daniel Petho (https://super-hover.danielpetho.com,
// https://github.com/danielpetho/super-hover) — MIT licensed.
//
// Native CSS `:hover` only updates when the pointer moves. Super Hover hit-tests
// the element under the pointer on every animation frame AND on scroll, so the
// "hovered" element keeps updating while the page scrolls beneath a still cursor.
// It toggles a `data-super-hover-active` attribute and dispatches bubbling
// `superhoverenter` / `superhoverleave` / `superhovermove` CustomEvents.
import * as React from "react"

/** Payload on `superhovermove` events fired each hit-test frame while active (`event.detail`). */
export type SuperHoverMoveEventDetail = {
  x: number
  y: number
  current: Element
}

/** Payload on `superhoverenter` / `superhoverleave` events (`event.detail`). */
export type SuperHoverEventDetail = {
  x: number
  y: number
  previous: Element | null
  current: Element | null
}

export type SuperHoverEnterEvent = CustomEvent<SuperHoverEventDetail>
export type SuperHoverLeaveEvent = CustomEvent<SuperHoverEventDetail>
export type SuperHoverMoveEvent = CustomEvent<SuperHoverMoveEventDetail>

/** Pointer kinds accepted for position updates. */
export type SuperHoverPointerType = "mouse" | "pen" | "touch"

/** Controller returned by {@link createSuperHover}. */
export type SuperHoverController = {
  pause(): void
  resume(): void
  refresh(): void
  destroy(): void
}

export type SuperHoverOptions = {
  /** When false, starts paused. @default true */
  enabled?: boolean
  /**
   * Pointer kinds whose `pointermove` events update the hit-test position. Touch
   * is omitted by default so scrolling on touch devices does not drive "hover".
   * @default ["mouse", "pen"]
   */
  pointerTypes?: SuperHoverPointerType[]
  /** Clear hover state while a pointer is pressed (e.g. during text selection). @default false */
  disableWhilePointerDown?: boolean
  /**
   * Subtree boundary: the matched element must be contained here (or the active
   * document when omitted). Pass an iframe `Document` or any element inside it to
   * hit-test that frame. @default undefined
   */
  root?: Document | Element
  /** Passed to `element.closest` to choose participating elements. @default "[data-super-hover]" */
  selector?: string
  /** Attribute toggled on the active element while hovered. @default "data-super-hover-active" */
  activeAttribute?: string
  /** CustomEvent type dispatched when an element becomes active. @default "superhoverenter" */
  enterEventType?: string
  /** CustomEvent type dispatched when an element stops being active. @default "superhoverleave" */
  leaveEventType?: string
  /** CustomEvent type dispatched each tick while active; `false` disables it. @default "superhovermove" */
  moveEventType?: string | false
}

const DEFAULT_SELECTOR = "[data-super-hover]"
const DEFAULT_ACTIVE = "data-super-hover-active"
const DEFAULT_ENTER_EVENT = "superhoverenter"
const DEFAULT_LEAVE_EVENT = "superhoverleave"
const DEFAULT_MOVE_EVENT = "superhovermove"
const DEFAULT_POINTER_TYPES: readonly SuperHoverPointerType[] = ["mouse", "pen"]

/** `Node.DOCUMENT_NODE` — detected via `nodeType` so cross-realm (iframe) documents resolve. */
const DOCUMENT_NODE = 9

function getScopeDocument(root?: Document | Element): Document {
  if (!root) return document
  if (root.nodeType === DOCUMENT_NODE) return root as Document
  return root.ownerDocument ?? document
}

function rootContains(
  root: Document | Element | undefined,
  el: Element
): boolean {
  if (!root) return true
  if (root.nodeType === DOCUMENT_NODE) {
    const html = (root as Document).documentElement
    return html ? html.contains(el) : false
  }
  return root.contains(el)
}

/**
 * Track the pointer and hit-test on every frame (and on scroll) so "hover" state
 * keeps updating while scrolling, unlike native `:hover`. Returns a controller you
 * must {@link SuperHoverController.destroy} on cleanup.
 */
export function createSuperHover(
  options: SuperHoverOptions = {}
): SuperHoverController {
  const selector = options.selector ?? DEFAULT_SELECTOR
  const activeAttribute = options.activeAttribute ?? DEFAULT_ACTIVE
  const enterEventType = options.enterEventType ?? DEFAULT_ENTER_EVENT
  const leaveEventType = options.leaveEventType ?? DEFAULT_LEAVE_EVENT
  const moveEventName =
    options.moveEventType === false
      ? null
      : (options.moveEventType ?? DEFAULT_MOVE_EVENT)
  const root = options.root
  const scopeDoc = getScopeDocument(root)
  const scopeWin = scopeDoc.defaultView ?? window
  const allowedPointerTypes = new Set<string>(
    options.pointerTypes ?? [...DEFAULT_POINTER_TYPES]
  )
  const disableWhilePointerDown = options.disableWhilePointerDown ?? false

  let running = options.enabled ?? true
  let destroyed = false

  let lastX = 0
  let lastY = 0
  let hasPointer = false
  let pointerDown = false
  let current: Element | null = null
  let rafId = 0
  let pending = false

  function cancelPendingFrame(): void {
    if (rafId !== 0) {
      scopeWin.cancelAnimationFrame(rafId)
      rafId = 0
      pending = false
    }
  }

  function deactivate(prev: Element, next: Element | null): void {
    prev.removeAttribute(activeAttribute)
    prev.dispatchEvent(
      new CustomEvent<SuperHoverEventDetail>(leaveEventType, {
        bubbles: true,
        cancelable: false,
        detail: { x: lastX, y: lastY, previous: prev, current: next },
      })
    )
  }

  function clearActive(): void {
    if (!current) return
    const prev = current
    current = null
    deactivate(prev, null)
  }

  function resolveTarget(): Element | null {
    if (!running || !hasPointer) return null
    if (disableWhilePointerDown && pointerDown) return null

    const hit = scopeDoc.elementFromPoint(lastX, lastY)
    if (!hit) return null
    const el = hit.closest(selector)
    if (!el) return null
    if (!rootContains(root, el)) return null
    return el
  }

  function apply(): void {
    if (destroyed || !running) {
      clearActive()
      return
    }

    const next = resolveTarget()
    if (next === current) return

    const previousElement = current

    if (current) {
      const prev = current
      current = null
      deactivate(prev, next)
    }

    current = next
    if (current) {
      current.setAttribute(activeAttribute, "")
      current.dispatchEvent(
        new CustomEvent<SuperHoverEventDetail>(enterEventType, {
          bubbles: true,
          cancelable: false,
          detail: { x: lastX, y: lastY, previous: previousElement, current },
        })
      )
    }
  }

  function schedule(): void {
    if (destroyed || pending) return
    // Coalesce many pointer/scroll/resize events into one hit-test before paint.
    pending = true
    rafId = scopeWin.requestAnimationFrame(() => {
      rafId = 0
      pending = false
      if (destroyed) return
      if (!running || !hasPointer) {
        clearActive()
        return
      }
      apply()
      if (moveEventName !== null && current !== null) {
        current.dispatchEvent(
          new CustomEvent<SuperHoverMoveEventDetail>(moveEventName, {
            bubbles: true,
            cancelable: false,
            detail: { x: lastX, y: lastY, current },
          })
        )
      }
    })
  }

  function onPointerMove(e: PointerEvent): void {
    if (destroyed) return
    if (!allowedPointerTypes.has(e.pointerType)) return
    lastX = e.clientX
    lastY = e.clientY
    hasPointer = true
    if (disableWhilePointerDown) pointerDown = e.buttons !== 0
    if (running) schedule()
  }

  function onPointerLeaveDocument(): void {
    hasPointer = false
    pointerDown = false
    schedule()
  }

  function onPointerDown(e: PointerEvent): void {
    if (destroyed || !disableWhilePointerDown) return
    if (!allowedPointerTypes.has(e.pointerType)) return
    lastX = e.clientX
    lastY = e.clientY
    hasPointer = true
    pointerDown = true
    if (running) schedule()
  }

  function onPointerUp(e: PointerEvent): void {
    if (destroyed || !disableWhilePointerDown) return
    if (allowedPointerTypes.has(e.pointerType)) {
      lastX = e.clientX
      lastY = e.clientY
      hasPointer = true
    }
    pointerDown = false
    if (running) schedule()
  }

  function onPointerOut(e: PointerEvent): void {
    if (!e.relatedTarget) onPointerLeaveDocument()
  }

  function onVisibilityChange(): void {
    if (scopeDoc.visibilityState === "hidden") {
      hasPointer = false
      schedule()
    }
  }

  scopeWin.addEventListener("pointermove", onPointerMove, { passive: true })
  scopeWin.addEventListener("pointerdown", onPointerDown, { passive: true })
  scopeWin.addEventListener("pointerup", onPointerUp, { passive: true })
  scopeDoc.addEventListener("scroll", schedule, {
    capture: true,
    passive: true,
  })
  scopeWin.addEventListener("resize", schedule, { passive: true })
  scopeWin.addEventListener("blur", onPointerLeaveDocument)
  scopeDoc.addEventListener("pointerleave", onPointerLeaveDocument)
  scopeDoc.addEventListener("pointercancel", onPointerLeaveDocument)
  scopeDoc.addEventListener("pointerout", onPointerOut)
  scopeDoc.addEventListener("visibilitychange", onVisibilityChange)

  schedule()

  return {
    pause() {
      if (destroyed) return
      running = false
      cancelPendingFrame()
      clearActive()
    },
    resume() {
      if (destroyed) return
      running = true
      schedule()
    },
    refresh() {
      if (destroyed) return
      schedule()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      scopeWin.removeEventListener("pointermove", onPointerMove)
      scopeWin.removeEventListener("pointerdown", onPointerDown)
      scopeWin.removeEventListener("pointerup", onPointerUp)
      scopeDoc.removeEventListener("scroll", schedule, { capture: true })
      scopeWin.removeEventListener("resize", schedule)
      scopeWin.removeEventListener("blur", onPointerLeaveDocument)
      scopeDoc.removeEventListener("pointerleave", onPointerLeaveDocument)
      scopeDoc.removeEventListener("pointercancel", onPointerLeaveDocument)
      scopeDoc.removeEventListener("pointerout", onPointerOut)
      scopeDoc.removeEventListener("visibilitychange", onVisibilityChange)
      cancelPendingFrame()
      hasPointer = false
      pointerDown = false
      clearActive()
    },
  }
}

/** Options for {@link useSuperHover} / {@link useSuperHoverRef}. */
export type UseSuperHoverOptions = Omit<
  SuperHoverOptions,
  "root" | "enabled"
> & {
  /** When false, does not mount Super Hover on `root`. @default true */
  enabled?: boolean
  /** Fires when an element becomes active; `event.detail.current` is that element. @default undefined */
  onEnter?: (event: SuperHoverEnterEvent) => void
  /** Fires when an element stops being active. @default undefined */
  onLeave?: (event: SuperHoverLeaveEvent) => void
  /** Fires each hit-test tick while an element stays active. @default undefined */
  onMove?: (event: SuperHoverMoveEvent) => void
}

const noop = () => {}

/**
 * Mount Super Hover on `root` and forward enter/leave/move events to callbacks.
 * Callbacks are read from refs, so passing inline handlers does not remount.
 */
export function useSuperHover(
  root: HTMLElement | null,
  {
    enabled = true,
    onEnter = noop,
    onLeave = noop,
    onMove,
    selector,
    activeAttribute,
    pointerTypes,
    disableWhilePointerDown,
    enterEventType = "superhoverenter",
    leaveEventType = "superhoverleave",
    moveEventType,
  }: UseSuperHoverOptions = {}
): void {
  const onEnterRef = React.useRef(onEnter)
  const onLeaveRef = React.useRef(onLeave)
  const onMoveRef = React.useRef(onMove)
  onEnterRef.current = onEnter
  onLeaveRef.current = onLeave
  onMoveRef.current = onMove

  const hasOnMove = onMove !== undefined

  React.useEffect(() => {
    if (!enabled || !root) return

    const handleEnter = (e: Event) =>
      onEnterRef.current(e as SuperHoverEnterEvent)
    const handleLeave = (e: Event) =>
      onLeaveRef.current(e as SuperHoverLeaveEvent)
    const handleMove = (e: Event) =>
      onMoveRef.current?.(e as SuperHoverMoveEvent)

    const resolvedMove =
      moveEventType === false ? null : (moveEventType ?? "superhovermove")
    const listenMove = resolvedMove !== null && hasOnMove

    root.addEventListener(enterEventType, handleEnter)
    root.addEventListener(leaveEventType, handleLeave)
    if (listenMove) root.addEventListener(resolvedMove, handleMove)

    const ctrl = createSuperHover({
      root,
      ...(selector !== undefined && { selector }),
      ...(activeAttribute !== undefined && { activeAttribute }),
      ...(pointerTypes !== undefined && { pointerTypes }),
      ...(disableWhilePointerDown !== undefined && { disableWhilePointerDown }),
      enterEventType,
      leaveEventType,
      ...(moveEventType !== undefined
        ? { moveEventType }
        : hasOnMove
          ? {}
          : { moveEventType: false }),
    })

    return () => {
      root.removeEventListener(enterEventType, handleEnter)
      root.removeEventListener(leaveEventType, handleLeave)
      if (listenMove) root.removeEventListener(resolvedMove, handleMove)
      ctrl.destroy()
    }
  }, [
    root,
    enabled,
    selector,
    activeAttribute,
    pointerTypes,
    disableWhilePointerDown,
    enterEventType,
    leaveEventType,
    moveEventType,
    hasOnMove,
  ])
}

/**
 * Like {@link useSuperHover} but returns a callback ref to attach to the scroll
 * root, so you do not have to manage `ref.current` yourself.
 */
export function useSuperHoverRef(
  options: UseSuperHoverOptions = {}
): React.RefCallback<HTMLElement> {
  const [node, setNode] = React.useState<HTMLElement | null>(null)
  useSuperHover(node, options)
  return React.useCallback((el: HTMLElement | null) => setNode(el), [])
}
```
