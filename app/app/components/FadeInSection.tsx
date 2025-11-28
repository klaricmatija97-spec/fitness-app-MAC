"use client";

import { ReactNode } from "react";
import { useFadeInOnScroll } from "./useFadeInOnScroll";
import styles from "./FadeInSection.module.css";

interface FadeInSectionProps {
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

/**
 * Reusable component that fades in on scroll
 * 
 * Usage:
 * <FadeInSection>
 *   <YourContent />
 * </FadeInSection>
 */
export default function FadeInSection({
  children,
  threshold = 0.1,
  rootMargin = "0px 0px -100px 0px",
  className = "",
}: FadeInSectionProps) {
  const [ref, isVisible] = useFadeInOnScroll(threshold, rootMargin);

  return (
    <div
      ref={ref}
      className={`${styles.fadeInSection} ${isVisible ? styles.visible : ""} ${className}`}
    >
      {children}
    </div>
  );
}


