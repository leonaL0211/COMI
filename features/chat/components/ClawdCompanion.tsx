"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

type ClawdMode = "idle" | "typing" | "reading";

type ClawdAction =
  | "idle"
  | "typing"
  | "reading"
  | "coffee-hand"
  | "shy"
  | "dizzy"
  | "yawn"
  | "sleeping";

type ClawdCompanionProps = {
  mode: ClawdMode;
  headerHeight: number;
  composerHeight: number;
};

type Position = {
  x: number;
  y: number;
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: Position;
  hasDragged: boolean;
};

// COMI-on-Desk pose set (public/comi-desk/) — replaces the earlier Clawd
// character. Same 8 ClawdAction slots as before; two poses are reused for
// two slots each (comi-peek for reading/shy, comi-sleepy for yawn/sleeping)
// since the source pose set doesn't have a distinct pose for every slot —
// see the AUDIT report this mapping came from. The old Clawd files remain
// in public/clawd/ (unreferenced, not deleted) in case of rollback.
const clawdAssets: Record<ClawdAction, string> = {
  idle: "/comi-desk/comi-default.svg",
  typing: "/comi-desk/comi-typing.svg",
  reading: "/comi-desk/comi-peek.svg",
  "coffee-hand": "/comi-desk/comi-coffee-break.svg",
  shy: "/comi-desk/comi-peek.svg",
  dizzy: "/comi-desk/comi-error-melt.svg",
  yawn: "/comi-desk/comi-sleepy.svg",
  sleeping: "/comi-desk/comi-sleepy.svg",
};

const idleActions: ClawdAction[] = [
  "idle",
  "coffee-hand",
  "shy",
  "dizzy",
  "yawn",
  "sleeping",
];
const clickActions: ClawdAction[] = ["shy", "dizzy", "coffee-hand"];
const dragThreshold = 6;
const edgePadding = 12;
const safeAreaGap = 16;
const minWanderDistance = 50;
const minWanderDurationMs = 10000;
const maxWanderDurationMs = 32000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * Math.max(0, max - min);
}

function getRandomItem<T>(items: readonly T[], fallback: T) {
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
}

function getPrefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ClawdCompanion({
  mode,
  headerHeight,
  composerHeight,
}: ClawdCompanionProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const clawdRef = useRef<HTMLButtonElement | null>(null);
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const boundsRef = useRef<Bounds>({
    minX: edgePadding,
    maxX: edgePadding,
    minY: edgePadding,
    maxY: edgePadding,
  });
  const dragRef = useRef<DragState | null>(null);
  const wanderTimerRef = useRef<number | null>(null);
  const actionTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<Position | null>(null);
  const reducedMotionRef = useRef(false);
  const hasInitialPositionRef = useRef(false);
  const [action, setAction] = useState<ClawdAction>("idle");
  const [assetVersion, setAssetVersion] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const clearWanderTimer = useCallback(() => {
    if (wanderTimerRef.current !== null) {
      window.clearTimeout(wanderTimerRef.current);
      wanderTimerRef.current = null;
    }
  }, []);

  const clearActionTimer = useCallback(() => {
    if (actionTimerRef.current !== null) {
      window.clearTimeout(actionTimerRef.current);
      actionTimerRef.current = null;
    }
  }, []);

  const setVisualAction = useCallback((nextAction: ClawdAction) => {
    setAction((current) => {
      if (current !== nextAction) {
        setAssetVersion((version) => version + 1);
      }

      return nextAction;
    });
  }, []);

  const measureViewportBounds = useCallback(() => {
    const overlay = overlayRef.current;
    const clawd = clawdRef.current;

    if (!overlay || !clawd) {
      return boundsRef.current;
    }

    const root = overlay.closest<HTMLElement>(".chat-main") ?? overlay;
    const rootRect = root.getBoundingClientRect();
    const clawdRect = clawd.getBoundingClientRect();
    const clawdWidth = clawdRect.width || 58;
    const clawdHeight = clawdRect.height || 58;
    const minX = edgePadding;
    const maxX = Math.max(minX, rootRect.width - clawdWidth - edgePadding);
    const minY = edgePadding;
    const maxY = Math.max(minY, rootRect.height - clawdHeight - edgePadding);

    return { minX, maxX, minY, maxY };
  }, []);

  const measureBounds = useCallback(() => {
    const overlay = overlayRef.current;
    const clawd = clawdRef.current;

    if (!overlay || !clawd) {
      return boundsRef.current;
    }

    const root = overlay.closest<HTMLElement>(".chat-main") ?? overlay;
    const rootRect = root.getBoundingClientRect();
    const clawdRect = clawd.getBoundingClientRect();
    const clawdWidth = clawdRect.width || 58;
    const clawdHeight = clawdRect.height || 58;
    const header = root.querySelector<HTMLElement>(".chat-header");
    const composer = root.querySelector<HTMLElement>(".composer-dock");
    const headerRect = header?.getBoundingClientRect();
    const composerRect = composer?.getBoundingClientRect();
    const headerBottom =
      headerRect && headerRect.height > 0
        ? headerRect.bottom - rootRect.top
        : headerHeight;
    const composerTop =
      composerRect && composerRect.height > 0
        ? composerRect.top - rootRect.top
        : rootRect.height - composerHeight;
    const minX = edgePadding;
    const maxX = Math.max(minX, rootRect.width - clawdWidth - edgePadding);
    const minY = Math.max(edgePadding, headerBottom + safeAreaGap);
    const maxY = Math.max(
      minY,
      composerTop - clawdHeight - safeAreaGap,
    );

    boundsRef.current = { minX, maxX, minY, maxY };
    return boundsRef.current;
  }, [composerHeight, headerHeight]);

  const applyPosition = useCallback(
    (position: Position, scale = 1, durationMs = 0) => {
      const clawd = clawdRef.current;

      if (!clawd) {
        return;
      }

      clawd.style.setProperty("--clawd-move-duration", `${durationMs}ms`);
      clawd.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`;
    },
    [],
  );

  const setClampedPosition = useCallback(
    (position: Position, scale = 1, durationMs = 0) => {
      const bounds = measureBounds();
      const nextPosition = {
        x: clamp(position.x, bounds.minX, bounds.maxX),
        y: clamp(position.y, bounds.minY, bounds.maxY),
      };

      positionRef.current = nextPosition;
      applyPosition(nextPosition, scale, durationMs);
    },
    [applyPosition, measureBounds],
  );

  const setViewportClampedPosition = useCallback(
    (position: Position, scale = 1, durationMs = 0) => {
      const bounds = measureViewportBounds();
      const nextPosition = {
        x: clamp(position.x, bounds.minX, bounds.maxX),
        y: clamp(position.y, bounds.minY, bounds.maxY),
      };

      positionRef.current = nextPosition;
      applyPosition(nextPosition, scale, durationMs);
    },
    [applyPosition, measureViewportBounds],
  );

  function getWanderTarget(bounds: Bounds, origin: Position) {
    let nextPosition = {
      x: randomBetween(bounds.minX, bounds.maxX),
      y: randomBetween(bounds.minY, bounds.maxY),
    };
    const firstDistance = Math.hypot(
      nextPosition.x - origin.x,
      nextPosition.y - origin.y,
    );

    if (firstDistance < minWanderDistance) {
      nextPosition = {
        x: randomBetween(bounds.minX, bounds.maxX),
        y: randomBetween(bounds.minY, bounds.maxY),
      };
    }

    return nextPosition;
  }

  function getWanderDurationMs(origin: Position, target: Position) {
    const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
    const pixelsPerSecond = randomBetween(8, 14);

    return clamp(
      (distance / pixelsPerSecond) * 1000,
      minWanderDurationMs,
      maxWanderDurationMs,
    );
  }

  const scheduleWander = useCallback(
    (delay = randomBetween(4000, 8000)) => {
      clearWanderTimer();

      if (reducedMotionRef.current || mode !== "idle" || dragRef.current) {
        return;
      }

      wanderTimerRef.current = window.setTimeout(() => {
        const bounds = measureBounds();
        const origin = positionRef.current;
        const nextPosition = getWanderTarget(bounds, origin);
        const durationMs = getWanderDurationMs(origin, nextPosition);
        const restMs = randomBetween(4000, 9000);

        setVisualAction(getRandomItem(idleActions, "idle"));
        setClampedPosition(nextPosition, 1, durationMs);
        scheduleWander(durationMs + restMs);
      }, delay);
    },
    [
      clearWanderTimer,
      measureBounds,
      mode,
      setClampedPosition,
      setVisualAction,
    ],
  );

  useEffect(() => {
    reducedMotionRef.current = getPrefersReducedMotion();
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    function handleMotionChange() {
      reducedMotionRef.current = getPrefersReducedMotion();

      if (reducedMotionRef.current) {
        clearWanderTimer();
        setVisualAction("idle");
      } else if (mode === "idle") {
        scheduleWander(randomBetween(2000, 4000));
      }
    }

    mediaQuery?.addEventListener("change", handleMotionChange);

    return () => mediaQuery?.removeEventListener("change", handleMotionChange);
  }, [clearWanderTimer, mode, scheduleWander, setVisualAction]);

  useEffect(() => {
    if (hasInitialPositionRef.current) {
      return;
    }

    const bounds = measureBounds();
    const startPosition = {
      x: randomBetween(bounds.minX, bounds.maxX),
      y: randomBetween(bounds.minY, bounds.maxY),
    };

    hasInitialPositionRef.current = true;
    setClampedPosition(startPosition);
  }, [measureBounds, setClampedPosition]);

  useEffect(() => {
    if (hasInitialPositionRef.current) {
      setClampedPosition(positionRef.current);
    }
  }, [composerHeight, headerHeight, setClampedPosition]);

  useEffect(() => {
    const overlay = overlayRef.current;

    if (!overlay || typeof ResizeObserver === "undefined") {
      return;
    }

    const root = overlay.closest<HTMLElement>(".chat-main") ?? overlay;
    const observer = new ResizeObserver(() => {
      measureBounds();
      setClampedPosition(positionRef.current);
    });

    observer.observe(root);

    return () => observer.disconnect();
  }, [measureBounds, setClampedPosition]);

  useEffect(() => {
    clearWanderTimer();
    clearActionTimer();

    if (mode === "typing") {
      setVisualAction("typing");
      return;
    }

    if (mode === "reading") {
      setVisualAction("reading");
      return;
    }

    setVisualAction("idle");
    scheduleWander(randomBetween(2000, 4000));
  }, [clearActionTimer, clearWanderTimer, mode, scheduleWander, setVisualAction]);

  useEffect(
    () => () => {
      clearWanderTimer();
      clearActionTimer();

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    },
    [clearActionTimer, clearWanderTimer],
  );

  function schedulePointerFrame(position: Position) {
    pendingPositionRef.current = position;

    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const nextPosition = pendingPositionRef.current;

      if (nextPosition) {
        setViewportClampedPosition(nextPosition, 1.04);
      }
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }

    clearWanderTimer();
    clearActionTimer();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: positionRef.current,
      hasDragged: false,
    };
    applyPosition(positionRef.current, 1.04);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (!drag.hasDragged && distance >= dragThreshold) {
      drag.hasDragged = true;
    }

    if (!drag.hasDragged) {
      return;
    }

    event.preventDefault();
    schedulePointerFrame({
      x: drag.origin.x + deltaX,
      y: drag.origin.y + deltaY,
    });
  }

  const finishPointerInteractionById = useCallback(
    (pointerId: number, isCancel = false) => {
    const drag = dragRef.current;
      const clawd = clawdRef.current;

      if (!drag || drag.pointerId !== pointerId) {
      return;
    }

      if (clawd?.hasPointerCapture(pointerId)) {
        clawd.releasePointerCapture(pointerId);
    }

    dragRef.current = null;
    setIsDragging(false);
    setViewportClampedPosition(positionRef.current);

    if (!drag.hasDragged && !isCancel && !reducedMotionRef.current) {
      setVisualAction(getRandomItem(clickActions, "shy"));
      actionTimerRef.current = window.setTimeout(() => {
        setVisualAction("idle");
        scheduleWander(randomBetween(2000, 4000));
      }, 1800);
      return;
    }

    if (mode === "idle") {
      scheduleWander(randomBetween(6000, 10000));
    }
    },
    [mode, scheduleWander, setViewportClampedPosition, setVisualAction],
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    function handleGlobalPointerUp(event: globalThis.PointerEvent) {
      finishPointerInteractionById(event.pointerId);
    }

    function handleGlobalPointerCancel(event: globalThis.PointerEvent) {
      finishPointerInteractionById(event.pointerId, true);
    }

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerCancel);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerCancel);
    };
  }, [finishPointerInteractionById, isDragging]);

  return (
    <div ref={overlayRef} className="clawd-overlay" aria-hidden={false}>
      <button
        ref={clawdRef}
        className={[
          "clawd-companion",
          isDragging ? "clawd-companion-dragging" : "",
        ].join(" ")}
        type="button"
        aria-label="Drag COMI to move it"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointerInteractionById(event.pointerId)}
        onPointerCancel={(event) =>
          finishPointerInteractionById(event.pointerId, true)
        }
      >
        <img
          key={`${action}-${assetVersion}`}
          src={clawdAssets[action]}
          width={112}
          height={112}
          alt=""
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
        />
      </button>
    </div>
  );
}
