"use client";

import { useEffect } from "react";

/**
 * Adds the `revealed` class to `.reveal-on-scroll` elements as they enter the
 * viewport. Runs in an effect (not an inline <script>) so it works on every
 * client-side navigation, not just the initial server-rendered load.
 */
export function ScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal-on-scroll");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
