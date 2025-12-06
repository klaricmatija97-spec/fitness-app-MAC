"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Poruke za kalkulatore - motivacijske i informativne
const calculatorMessages = [
  {
    title: "Zašto su kalkulatori važni?",
    lines: [
      "Precizno znanje o vašim potrebama",
      "je temelj svake uspješne transformacije.",
      "Bez brojeva, samo nagađate."
    ]
  },
  {
    title: "BMR - Vaša metabolička osnova",
    lines: [
      "Tijelo troši energiju čak i dok spavate.",
      "BMR pokazuje koliko kalorija trebate",
      "samo za osnovne životne funkcije."
    ]
  },
  {
    title: "TDEE - Stvarna potrošnja",
    lines: [
      "Dodajte aktivnost na BMR",
      "i dobijete pravu sliku",
      "vaše dnevne potrošnje energije."
    ]
  },
  {
    title: "Ciljane kalorije",
    lines: [
      "Želite li gubiti, održavati ili dobivati?",
      "Jednostavna prilagodba TDEE-a",
      "daje vam jasan cilj."
    ]
  },
  {
    title: "Makronutrijenti",
    lines: [
      "Proteini grade mišiće.",
      "Ugljikohidrati daju energiju.",
      "Masti održavaju hormone."
    ]
  }
];

export default function CalcFAQRotation() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % calculatorMessages.length);
        setIsAnimating(true);
      }, 500);
    }, 7000); // Change every 7 seconds for slower, more readable pace

    return () => clearInterval(interval);
  }, []);

  const currentMessage = calculatorMessages[currentIndex];

  // Staggered line animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.4,
        delayChildren: 0.2,
      }
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.1,
        staggerDirection: -1,
      }
    }
  };

  const lineVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      filter: "blur(4px)"
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.8,
        ease: [0.22, 0.61, 0.36, 1]
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      filter: "blur(4px)",
      transition: {
        duration: 0.4
      }
    }
  };

  const titleVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.9,
      y: -10
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 0.61, 0.36, 1]
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full py-8">
      <AnimatePresence mode="wait">
        {isAnimating && (
          <motion.div
            key={currentIndex}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
            className="text-center max-w-xl mx-auto"
          >
            {/* Title */}
            <motion.h3
              variants={titleVariants}
              className="text-sm md:text-base font-light tracking-[0.3em] text-white/40 uppercase mb-6"
            >
              {currentMessage.title}
            </motion.h3>

            {/* Lines - each animates separately */}
            <div className="space-y-2">
              {currentMessage.lines.map((line, idx) => (
                <motion.p
                  key={idx}
                  variants={lineVariants}
                  className="text-lg md:text-xl lg:text-2xl font-light text-white/90 leading-relaxed tracking-wide"
                >
                  {line}
                </motion.p>
              ))}
            </div>

            {/* Subtle decorative line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
              className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mt-8"
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Progress dots - subtle */}
      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {calculatorMessages.map((_, idx) => (
          <motion.div
            key={idx}
            animate={{
              scale: idx === currentIndex ? 1 : 0.8,
              opacity: idx === currentIndex ? 1 : 0.3,
            }}
            transition={{ duration: 0.3 }}
            className={`rounded-full transition-all duration-500 ${
              idx === currentIndex
                ? "w-6 h-1 bg-white/60"
                : "w-1 h-1 bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

