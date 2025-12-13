"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for reveal-on-scroll animation using IntersectionObserver
 * 
 * @param threshold - IntersectionObserver threshold (0-1), default 0.2
 * @param rootMargin - Margin around root, default "0px"
 * @returns [ref, isVisible] - ref to attach to element, isVisible state
 * 
 * Usage:
 * const [ref, isVisible] = useRevealOnScroll();
 * return <div ref={ref} className={isVisible ? 'reveal in' : 'reveal'}>Content</div>
 */
export function useRevealOnScroll(
  threshold: number = 0.2,
  rootMargin: string = "0px"
) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Disconnect after first trigger to prevent re-animation
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return [ref, isVisible] as const;
}

