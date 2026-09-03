"use client";

import { useEffect, useState } from "react";
import type { Ref } from "react";
import { GlassButton } from "./GlassButton";

type ChatHeaderProps = {
  title: string;
  headerRef: Ref<HTMLElement>;
  onOpenSidebar: () => void;
  onOpenMemoryPanel: () => void;
};

export function ChatHeader({
  title,
  headerRef,
  onOpenSidebar,
  onOpenMemoryPanel,
}: ChatHeaderProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMoreMenuOpen]);

  function openMemoryPanel() {
    setIsMoreMenuOpen(false);
    onOpenMemoryPanel();
  }

  return (
    <header
      ref={headerRef}
      className={`chat-header${isMoreMenuOpen ? " chat-header-more-open" : ""}`}
    >
      <div className="chat-topbar-fade" aria-hidden="true" />
      <div className="chat-header-inner chat-topbar-content">
        <GlassButton
          className="mobile-sidebar-trigger"
          type="button"
          label="Open conversations"
          onClick={onOpenSidebar}
        >
          <img
            className="figma-topbar-icon"
            src="/comi/figma/home-menu.svg"
            alt=""
            draggable={false}
          />
        </GlassButton>
        <p className="chat-header-title" aria-hidden="true">
          {title}
        </p>
        <GlassButton
          className="chat-memory-button"
          type="button"
          label="More"
          aria-haspopup="dialog"
          aria-expanded={isMoreMenuOpen}
          onClick={() => setIsMoreMenuOpen((isOpen) => !isOpen)}
        >
          <img
            className="figma-topbar-icon"
            src="/comi/figma/home-more.svg"
            alt=""
            draggable={false}
          />
        </GlassButton>
      </div>
      {isMoreMenuOpen ? (
        <div
          className="more-menu-backdrop"
          role="presentation"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <section
            className="more-menu-panel"
            role="dialog"
            aria-label="More menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="more-menu-handle" aria-hidden="true" />
            <div className="more-menu-heading">
              <p className="more-menu-title">More</p>
              <button
                className="more-menu-close"
                type="button"
                aria-label="Close more menu"
                onClick={() => setIsMoreMenuOpen(false)}
              >
                Close
              </button>
            </div>
            <button
              className="more-menu-memory-item"
              type="button"
              onClick={openMemoryPanel}
            >
              <span>
                <span className="more-menu-item-title">Memory</span>
                <span className="more-menu-item-subtitle">
                  View and manage what COMI remembers.
                </span>
              </span>
              <span className="more-menu-item-arrow" aria-hidden="true">
                -
              </span>
            </button>
          </section>
        </div>
      ) : null}
    </header>
  );
}
