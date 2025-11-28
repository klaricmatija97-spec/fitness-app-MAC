"use client";

import { useEffect, useState } from "react";
import styles from "./HeroSection.module.css";

interface HeroSectionProps {
  backgroundImage?: string;
  kicker?: string;
  heading: string;
  subheading: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

export default function HeroSection({
  backgroundImage = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80&auto=format&fit=crop",
  kicker = "MALI POMACI U NAVIKAMA, VELIKI POMACI U ENERGIJI.",
  heading = "Prehrana koja radi za tebe, ne protiv tebe",
  subheading = "Ne moraš na dijeti da bi napredovao. Fokus je na hrani koja ti daje energiju bez stresa i brojanja kalorija.",
  ctaText = "Započni besplatan razgovor",
  onCtaClick,
}: HeroSectionProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    // Load background image
    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => {
      setImageLoaded(true);
      // Trigger content animation after image loads
      setTimeout(() => setContentVisible(true), 100);
    };
  }, [backgroundImage]);

  return (
    <section className={styles.hero}>
      {/* Background Image Container */}
      <div className={styles.heroBackground}>
        <div
          className={`${styles.heroImage} ${imageLoaded ? styles.heroImageLoaded : ""}`}
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        {/* Dark Overlay - gradient for better text readability */}
        <div className={styles.heroOverlay} />
      </div>

      {/* Content Container */}
      <div className={styles.heroContent}>
        <div className={`${styles.heroText} ${contentVisible ? styles.heroTextVisible : ""}`}>
          {/* Kicker Text */}
          {kicker && (
            <p className={styles.heroKicker}>{kicker}</p>
          )}

          {/* Main Heading */}
          <h1 className={styles.heroHeading}>{heading}</h1>

          {/* Subheading */}
          <p className={styles.heroSubheading}>{subheading}</p>

          {/* CTA Button */}
          {ctaText && (
            <button
              className={styles.heroButton}
              onClick={onCtaClick}
              aria-label={ctaText}
            >
              {ctaText}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

