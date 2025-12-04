"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Dark-themed food images - high quality
const FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1920&h=1080&fit=crop&q=80",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&h=1080&fit=crop&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&h=1080&fit=crop&q=80",
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=1920&h=1080&fit=crop&q=80",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1920&h=1080&fit=crop&q=80",
];

interface MealPlanWelcomeScreenProps {
  onNavigate: () => void;
  onBack?: () => void;
}

export default function MealPlanWelcomeScreen({ onNavigate, onBack }: MealPlanWelcomeScreenProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showBackArrow, setShowBackArrow] = useState(false);

  // Trigger animations on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Rotate background images every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % FOOD_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Text animation - word by word
  const titleWords = "DOBRODOŠLI U GENERATOR VAŠEG SEDMODNEVNOG PLANA PREHRANE".split(" ");
  const descriptionText = "Generator na temelju vaših osobnih preferencija bira namirnice i isporučuje sedmodnevni jelovnik sukladno vašim dnevnim kalorijskim potrebama i vašim izračunatim makronutrijentima.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
      {/* Solid black base - prevents any flash */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Rotating Background Images - Full Screen */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center transform scale-105"
            style={{ 
              backgroundImage: `url(${FOOD_IMAGES[currentImageIndex]})`,
              filter: "brightness(0.3) saturate(0.8)"
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Elegant gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      
      {/* Subtle vignette effect */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)"
      }} />

      {/* Back Arrow - Fixed to left */}
      {onBack && (
        <motion.div
          className="fixed left-6 md:left-10 top-1/2 -translate-y-1/2 z-[60]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: showBackArrow ? 1 : 0.6,
            x: 0,
            scale: showBackArrow ? 1.1 : 1
          }}
          transition={{ duration: 0.3, delay: 0.5 }}
          onMouseEnter={() => setShowBackArrow(true)}
          onMouseLeave={() => setShowBackArrow(false)}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.15, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/20 hover:border-white/40"
            aria-label="Nazad"
          >
            <svg
              className="w-6 h-6 md:w-7 md:h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>
        </motion.div>
      )}

      {/* Content Container - Centered */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 md:px-12 max-w-5xl mx-auto text-center">
        
        {/* CORPEX Logo - Refined */}
        <motion.div
          initial={{ opacity: 0, y: -30, letterSpacing: "0.2em" }}
          animate={isVisible ? { opacity: 1, y: 0, letterSpacing: "0.5em" } : {}}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mb-16"
        >
          <span className="text-sm md:text-base font-light tracking-[0.5em] text-white/70 uppercase">
            Corpex
          </span>
        </motion.div>

        {/* Main Title - Word by Word Animation */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extralight text-white leading-relaxed tracking-wide">
            {titleWords.map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                animate={isVisible ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.5 + index * 0.12,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="inline-block mr-[0.3em]"
              >
                {word}
              </motion.span>
            ))}
          </h1>
        </div>

        {/* Elegant divider line */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isVisible ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: 2, ease: "easeOut" }}
          className="w-24 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent mb-10"
        />

        {/* Description Text - Fade in */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.2, delay: 2.5, ease: "easeOut" }}
          className="text-base md:text-lg lg:text-xl text-white/60 leading-relaxed max-w-3xl mx-auto font-light tracking-wide"
        >
          {descriptionText}
        </motion.p>

        {/* CTA Button - Refined */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 3.2, ease: "easeOut" }}
          className="mt-16"
        >
          <motion.button
            whileHover={{ 
              scale: 1.02,
              backgroundColor: "rgba(255,255,255,0.1)",
              borderColor: "rgba(255,255,255,0.8)"
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onNavigate}
            className="group relative px-14 py-5 bg-transparent border border-white/30 text-white text-sm md:text-base font-light tracking-[0.2em] uppercase
                       transition-all duration-500 overflow-hidden"
          >
            {/* Hover shine effect */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            />
            <span className="relative z-10">Idi na plan prehrane</span>
          </motion.button>
        </motion.div>

        {/* Subtle image indicator dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 3.5 }}
          className="flex gap-3 mt-16"
        >
          {FOOD_IMAGES.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                scale: index === currentImageIndex ? 1 : 0.8,
                opacity: index === currentImageIndex ? 1 : 0.3
              }}
              transition={{ duration: 0.5 }}
              className={`h-[2px] rounded-full transition-all duration-500 ${
                index === currentImageIndex 
                  ? "w-8 bg-white" 
                  : "w-2 bg-white/40"
              }`}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

