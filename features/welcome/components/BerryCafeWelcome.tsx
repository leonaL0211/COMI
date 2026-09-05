"use client";

type BerryCafeWelcomeProps = {
  onEnter: () => void;
};

export function BerryCafeWelcome({ onEnter }: BerryCafeWelcomeProps) {
  function handleEnter() {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.setTimeout(onEnter, prefersReducedMotion ? 20 : 180);
  }

  return (
    <main className="comi-welcome-page">
      <button
        className="comi-welcome-frame"
        type="button"
        aria-label="Enter COMI"
        onClick={handleEnter}
      >
        <span className="comi-welcome-glow comi-welcome-glow-1" aria-hidden="true">
          <img src="/comi/figma/welcome-glow-1.svg" alt="" draggable={false} />
        </span>
        <span className="comi-welcome-glow comi-welcome-glow-2" aria-hidden="true">
          <img src="/comi/figma/welcome-glow-2.svg" alt="" draggable={false} />
        </span>
        <img
          className="comi-welcome-logo"
          src="/comi/figma/welcome-comi.png"
          alt=""
          draggable={false}
        />
        <span className="comi-welcome-title">COMI</span>
        <span className="comi-welcome-slogan">There&rsquo;s always more to say.</span>
      </button>
    </main>
  );
}
