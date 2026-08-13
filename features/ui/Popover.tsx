"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ReactNode, Ref } from "react";

type PopoverTriggerProps = {
  ref: Ref<HTMLButtonElement>;
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
};

type PopoverProps = {
  ariaLabel: string;
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: ReactNode;
  contentClassName?: string;
  closeOnButtonClick?: boolean;
};

export function Popover({
  ariaLabel,
  trigger,
  children,
  contentClassName = "",
  closeOnButtonClick = true,
}: PopoverProps) {
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const close = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const updatePosition = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    const content = contentRef.current;

    if (!triggerRect) {
      return;
    }

    const contentWidth = content?.offsetWidth ?? 180;
    const contentHeight = content?.offsetHeight ?? 120;
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.right - contentWidth),
      window.innerWidth - contentWidth - viewportPadding,
    );
    const preferredTop = triggerRect.bottom + 8;
    const top =
      preferredTop + contentHeight > window.innerHeight - viewportPadding
        ? Math.max(viewportPadding, triggerRect.top - contentHeight - 8)
        : preferredTop;

    setPosition({
      top,
      left,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        rootRef.current?.contains(target) ||
        contentRef.current?.contains(target)
      ) {
        return;
      }

      close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [close, isOpen, updatePosition]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  return (
    <div ref={rootRef} className="popover-root">
      {trigger({
        ref: triggerRef,
        "aria-expanded": isOpen,
        "aria-controls": contentId,
        onClick: () => setIsOpen((current) => !current),
      })}
      {isOpen ? (
        <div
          ref={contentRef}
          id={contentId}
          className={`popover-content ${contentClassName}`.trim()}
          role="menu"
          aria-label={ariaLabel}
          style={{ top: position.top, left: position.left }}
          onClick={(event) => {
            if (
              closeOnButtonClick &&
              (event.target as HTMLElement).closest("button")
            ) {
              window.setTimeout(close, 0);
            }
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
