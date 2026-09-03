"use client";

import { useEffect } from "react";

export type MemoryToastState = {
  id: number;
  message: string;
};

type MemoryToastProps = {
  toast: MemoryToastState | null;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 3200;

/**
 * Silent, non-blocking feedback for automatic memory extraction. Rendered
 * only when a chat turn just produced a "created" or "updated" memory —
 * never for "ignored"/"fallback", and never more than one toast per turn.
 */
export function MemoryToast({ toast, onDismiss }: MemoryToastProps) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  return (
    <div className="memory-toast-layer" aria-live="polite">
      <div key={toast.id} className="memory-toast" role="status">
        {toast.message}
      </div>
    </div>
  );
}
