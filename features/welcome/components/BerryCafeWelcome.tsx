"use client";

import Image from "next/image";
import { Pixelify_Sans } from "next/font/google";
import { useEffect, useState } from "react";
import { WELCOME_MESSAGES } from "../constants/welcomeMessages";

type BerryCafeWelcomeProps = {
  onEnter: () => void;
};

const infoCards = [
  {
    title: "日期",
    value: "-- / -- / --",
    label: "DATE",
  },
  {
    title: "天气",
    value: "-- °C",
    label: "WEATHER",
  },
  {
    title: "心情",
    value: "......",
    label: "MOOD",
  },
] as const;

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export function BerryCafeWelcome({ onEnter }: BerryCafeWelcomeProps) {
  const [message, setMessage] = useState<string>(WELCOME_MESSAGES[0]);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const nextMessage =
      WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)] ??
      WELCOME_MESSAGES[0];

    setMessage(nextMessage);
  }, []);

  function handleEnter() {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setIsLeaving(true);
    window.setTimeout(onEnter, prefersReducedMotion ? 20 : 240);
  }

  return (
    <main
      className={[
        "berry-cafe-page",
        isLeaving ? "berry-cafe-page-leaving" : "",
      ].join(" ")}
    >
      <div className="berry-cafe-shell">
        <header className="berry-cafe-title-area">
          <h1 className={`${pixelifySans.className} berry-cafe-title`}>
            Berry Café
          </h1>
          <p className="berry-cafe-subtitle">圆圆与小克</p>
        </header>

        <section className="berry-cafe-scene" aria-label="圆圆与小克喝咖啡">
          <Image
            src="/berry-cafe/berry-cafe-scene.png"
            alt="圆圆与小克坐在咖啡桌旁"
            width={768}
            height={524}
            priority
          />
        </section>

        <section className="berry-cafe-info-grid" aria-label="今日小卡片">
          {infoCards.map((card) => (
            <article key={card.title} className="berry-cafe-info-card">
              <span className="berry-cafe-info-icon" aria-hidden="true">
                {card.label}
              </span>
              <h2>{card.title}</h2>
              <p>{card.value}</p>
            </article>
          ))}
        </section>

        <section className="berry-cafe-message-card">
          <h2>欢迎来到 Berry Café</h2>
          <p>{message}</p>
        </section>

        <div className="berry-cafe-enter-area">
          <button
            className="berry-cafe-enter-button"
            type="button"
            aria-label="推开咖啡馆的门，进入 Berry Chat"
            onClick={handleEnter}
          >
            推开咖啡馆的门
          </button>
          <p>进入 Berry Chat</p>
        </div>
      </div>
    </main>
  );
}
