"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface EducationalSlideProps {
  title: string;
  subtitle?: string;
  body: string;
  points: string[];
  ctaText?: string;
  slideId: string;
  backgroundImage?: string;
}

// Mapiranje slajdova na pozadinske slike (tamne fitness/wellness teme)
const backgroundImages: Record<string, { topLeft: string; bottomRight: string }> = {
  edu_nutrition_intro: {
    topLeft: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80&auto=format&fit=crop",
    bottomRight: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=80&auto=format&fit=crop",
  },
  edu_kitchen: {
    topLeft: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1920&q=80&auto=format&fit=crop",
    bottomRight: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=80&auto=format&fit=crop",
  },
  edu_simple_meals: {
    topLeft: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1920&q=80&auto=format&fit=crop",
    bottomRight: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80&auto=format&fit=crop",
  },
  edu_sweets: {
    topLeft: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1920&q=80&auto=format&fit=crop",
    bottomRight: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1920&q=80&auto=format&fit=crop",
  },
  edu_hydration: {
    topLeft: "https://images.unsplash.com/photo-1548839140-5a71977ae41f?w=1920&q=80&auto=format&fit=crop",
    bottomRight: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=1920&q=80&auto=format&fit=crop",
  },
  edu_habits: {
    topLeft: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=80&auto=format&fit=crop",
    bottomRight: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80&auto=format&fit=crop",
  },
  edu_outro: {
    topLeft: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80&auto=format&fit=crop",
    bottomRight: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&q=80&auto=format&fit=crop",
  },
};

export default function EducationalSlide({ 
  title, 
  subtitle, 
  body, 
  points, 
  ctaText, 
  slideId,
}: EducationalSlideProps) {
  const [imagesLoaded, setImagesLoaded] = useState({ topLeft: false, bottomRight: false });
  const images = backgroundImages[slideId] || backgroundImages.edu_nutrition_intro;

  useEffect(() => {
    setImagesLoaded({ topLeft: false, bottomRight: false });
    
    const img1 = new Image();
    img1.src = images.topLeft;
    img1.onload = () => setImagesLoaded(prev => ({ ...prev, topLeft: true }));

    const img2 = new Image();
    img2.src = images.bottomRight;
    img2.onload = () => setImagesLoaded(prev => ({ ...prev, bottomRight: true }));
  }, [images]);

  return (
    <div 
      className="relative w-full h-full min-h-screen overflow-hidden bg-[#0d0d0f]"
      style={{
        willChange: "transform",
        transform: "translateZ(0)",
        contain: "layout paint",
      }}
    >
      {/* 2x2 Grid - 4 kvadrata */}
      <div className="grid grid-cols-2 grid-rows-2 h-screen w-full">
        {/* Gore lijevo: SLIKA - Premium Ken Burns Effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: imagesLoaded.topLeft ? 1 : 0,
            scale: imagesLoaded.topLeft ? [1, 1.05] : 1,
            x: imagesLoaded.topLeft ? [0, -15] : 0,
            y: imagesLoaded.topLeft ? [0, -10] : 0,
          }}
          transition={{
            opacity: { duration: 0.6, ease: "easeOut" },
            scale: {
              duration: 10,
              ease: "linear",
              repeat: Infinity,
              repeatType: "reverse" as const,
            },
            x: {
              duration: 12,
              ease: "linear",
              repeat: Infinity,
              repeatType: "reverse" as const,
            },
            y: {
              duration: 8,
              ease: "linear",
              repeat: Infinity,
              repeatType: "reverse" as const,
            },
          }}
          className="relative overflow-hidden rounded-br-3xl"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${images.topLeft})`,
              backgroundSize: "120%",
            }}
          />
          {/* Enhanced Dark Overlay - 40-60% za čitljivost */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
        </motion.div>

        {/* Gore desno: TEKST - Premium Stagger Animations */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative bg-[#0d0d0f] p-6 sm:p-8 lg:p-12 flex flex-col justify-center overflow-hidden rounded-bl-3xl"
        >
          {/* Dekorativni svjetlosni efekti u pozadini */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#4B0082]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#3b82f6]/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            {/* Label/Tag - Reels style badge */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="mb-6"
            >
              <span className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/90 to-purple-500/90 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold tracking-wider uppercase border border-purple-400/30 shadow-lg">
                Program prehrane
              </span>
            </motion.div>

            {/* Subtitle */}
            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.25,
                  ease: [0.22, 0.61, 0.36, 1],
                }}
                className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#A9B1B8] mb-4 font-medium"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {subtitle}
              </motion.p>
            )}

            {/* Title - Stagger Animation */}
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.4,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
            {title}
            </motion.h2>

            {/* Body - Stagger Animation */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.55,
                ease: [0.22, 0.61, 0.36, 1],
              }}
              className="text-sm sm:text-base lg:text-lg text-[#E5E7EB] leading-relaxed"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {body}
            </motion.p>
          </div>
        </motion.div>

        {/* Dolje lijevo: TEKST - Premium Stagger Animations */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative bg-[#0d0d0f] p-6 sm:p-8 lg:p-12 flex flex-col justify-center overflow-hidden rounded-tr-3xl"
        >
          {/* Dekorativni svjetlosni efekti u pozadini */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-[#4B0082]/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#3b82f6]/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10">
            {points.length > 0 && (
              <ul className="space-y-4 sm:space-y-5">
              {points.map((point, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: 0.7 + idx * 0.1,
                      ease: [0.22, 0.61, 0.36, 1]
                    }}
                    className="text-sm sm:text-base lg:text-lg text-white flex items-start gap-3"
                    style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    <span className="text-[#4B0082] mt-1.5 font-bold text-xl flex-shrink-0">•</span>
                    <span className="leading-relaxed">{point}</span>
                  </motion.li>
              ))}
            </ul>
          )}
            
            {/* CTA Button - Premium Animation */}
            {ctaText && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: 0.7 + (points.length * 0.1) + 0.3,
                  ease: [0.22, 0.61, 0.36, 1],
                }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 8px 30px rgba(107, 70, 193, 0.5)",
                }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold text-sm sm:text-base tracking-wide shadow-xl hover:shadow-2xl transition-all duration-300 w-fit"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                {ctaText}
              </motion.button>
            )}
        </div>
        </motion.div>

        {/* Dolje desno: SLIKA - Premium Ken Burns + Parallax Effect */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ 
            opacity: imagesLoaded.bottomRight ? 1 : 0,
            x: imagesLoaded.bottomRight ? 0 : 30,
            scale: imagesLoaded.bottomRight ? [1, 1.05] : 1,
            y: imagesLoaded.bottomRight ? [0, -10] : 0,
          }}
          transition={{
            opacity: { duration: 0.6, ease: "easeOut" },
            x: { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] },
            scale: {
              duration: 10,
              ease: "linear",
              repeat: Infinity,
              repeatType: "reverse" as const,
            },
            y: {
              duration: 8,
              ease: "linear",
              repeat: Infinity,
              repeatType: "reverse" as const,
            },
          }}
          className="relative overflow-hidden rounded-tl-3xl"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${images.bottomRight})`,
              backgroundSize: "120%",
            }}
          />
          {/* Enhanced Dark Overlay - 40-60% za čitljivost */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
        </motion.div>
      </div>
    </div>
  );
}
