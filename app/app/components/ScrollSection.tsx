"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import FadeInSection from "./FadeInSection";
import clsx from "clsx";

interface ScrollSectionProps {
  children: ReactNode;
  id: string;
  className?: string;
  backgroundImage?: string;
  isFullScreen?: boolean;
  showLogo?: boolean;
  showNumber?: boolean;
  number?: number;
  total?: number;
  title?: string;
  description?: string;
}

/**
 * ScrollSection - Sekcija koja se pojavljuje s animacijom dok korisnik skrola
 * Zamjenjuje slide-based sistem s vertikalnim scroll-om
 */
export default function ScrollSection({
  children,
  id,
  className = "",
  backgroundImage,
  isFullScreen = false,
  showLogo = true,
  showNumber = true,
  number,
  total,
  title,
  description,
}: ScrollSectionProps) {
  return (
    <section
      id={id}
      className={clsx(
        "relative w-full",
        isFullScreen ? "min-h-screen" : "min-h-[80vh] py-20",
        className
      )}
    >
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2500ms] ease-in-out"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              filter: "brightness(0.3) saturate(0.7)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />
          {/* Bottom gradient overlay for text contrast */}
          <div className="bg-gradient" />
        </div>
      )}

      {/* Content */}
      <FadeInSection
        threshold={0.2}
        rootMargin="0px 0px -150px 0px"
        className="relative z-10"
      >
        <div
          className={clsx(
            "w-full flex flex-col items-center justify-center px-8 py-12",
            isFullScreen ? "min-h-screen" : "min-h-[80vh]"
          )}
        >
          <div className="w-full max-w-2xl text-center">
            {/* Logo */}
            {showLogo && (
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-xs font-light tracking-[0.5em] text-white/40 uppercase mb-8"
              >
                Corpex
              </motion.p>
            )}

            {/* Number */}
            {showNumber && number !== undefined && total !== undefined && (
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-sm font-light tracking-widest text-white/30 mb-4"
              >
                {String(number).padStart(2, "0")} / {total}
              </motion.p>
            )}

            {/* Title */}
            {title && (
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-3xl md:text-4xl font-light text-white mb-4 tracking-wide"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {title}
              </motion.h1>
            )}

            {/* Description */}
            {description && (
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-base text-white/50 mb-8 font-light max-w-xl mx-auto"
              >
                {description}
              </motion.p>
            )}

            {/* Divider */}
            {(title || description) && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-8"
              />
            )}

            {/* Content */}
            <div className="text-left">
              {children}
            </div>
          </div>
        </div>
      </FadeInSection>
    </section>
  );
}

