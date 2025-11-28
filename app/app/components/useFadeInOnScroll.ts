"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for fade-in on scroll animation
 * 
 * @param threshold - IntersectionObserver threshold (0-1), default 0.1
 * @param rootMargin - Margin around root, default "0px 0px -100px 0px"
 * @returns [ref, isVisible] - ref to attach to element, isVisible state
 * 
 * Usage:
 * const [ref, isVisible] = useFadeInOnScroll();
 * return <div ref={ref} className={isVisible ? 'fade-in' : 'hidden'}>Content</div>
 */
export function useFadeInOnScroll(
  threshold: number = 0.1,
  rootMargin: string = "0px 0px -100px 0px"
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
          // Optionally disconnect after first trigger to prevent re-animation
          // observer.disconnect();
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
    };
  }, [threshold, rootMargin]);

  return [ref, isVisible] as const;
}


