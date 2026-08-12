"use client";

import { useEffect } from "react";

const hasReloadedForControllerKey = "comi-sw-controller-reloaded";

export function PwaRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const buildId =
      document.documentElement.dataset.buildId ?? "unknown-build";
    let hasReloadedForController = false;

    function reloadOnceForNewController() {
      if (hasReloadedForController) {
        return;
      }

      hasReloadedForController = true;

      try {
        if (
          window.sessionStorage.getItem(hasReloadedForControllerKey) === buildId
        ) {
          return;
        }

        window.sessionStorage.setItem(hasReloadedForControllerKey, buildId);
      } catch {
        // If sessionStorage is unavailable, still avoid multiple reloads in memory.
      }

      window.location.reload();
    }

    function postVersionRequest(worker: ServiceWorker | null) {
      worker?.postMessage({
        type: "COMI_VERSION",
        buildId,
      });
    }

    function handleControllerChange() {
      reloadOnceForNewController();
    }

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "COMI_SW_VERSION") {
        document.documentElement.dataset.swVersion =
          event.data.version ?? "unknown";
      }
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );
    navigator.serviceWorker.addEventListener("message", handleMessage);

    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(
      (registration) => {
        postVersionRequest(registration.active);
        postVersionRequest(registration.waiting);
        postVersionRequest(registration.installing);

        if (registration.waiting) {
          registration.waiting.postMessage({
            type: "COMI_SKIP_WAITING",
            buildId,
          });
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;

          if (!worker) {
            return;
          }

          postVersionRequest(worker);
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({
                type: "COMI_SKIP_WAITING",
                buildId,
              });
            }
          });
        });
      },
    ).catch(() => {
      // PWA registration is best-effort and must not affect chat.
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
