"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useRevealOnScroll } from "./useRevealOnScroll";
import clsx from "clsx";

interface RevealSectionProps {
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

/**
 * RevealSection - Modern reveal-on-scroll component
 * Uses IntersectionObserver with specific animation specs
 */
export default function RevealSection({
  children,
  threshold = 0.2,
  rootMargin = "0px",
  className = "",
}: RevealSectionProps) {
  const [ref, isVisible] = useRevealOnScroll(threshold, rootMargin);

  return (
    <div
      ref={ref}
      className={clsx("reveal", isVisible && "in", className)}
    >
      {children}
    </div>
  );
}

/**
 * Hook to observe all .reveal elements and add .in class when visible
 * Also applies stagger delays to .option elements per section
 */
export function useRevealObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            
            // Apply stagger to .option elements within this section
            const section = entry.target.closest("section, .card");
            if (section) {
              const options = section.querySelectorAll(".option:not(.in)");
              options.forEach((option, index) => {
                setTimeout(() => {
                  option.classList.add("in");
                }, index * 50); // 50ms stagger delay
              });
            }
            
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px",
      }
    );

    // Observe all .reveal elements
    const observeElements = () => {
      const revealElements = document.querySelectorAll(".reveal:not(.in)");
      revealElements.forEach((el) => observer.observe(el));
    };

    // Initial observe
    observeElements();

    // Re-observe periodically for dynamically added content
    const interval = setInterval(observeElements, 500);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}

