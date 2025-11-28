"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { commonQuestions } from "@/lib/common-questions";

export default function FAQRotation() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % commonQuestions.length);
    }, 5500); // Change every 5.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-2xl"
        >
          <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border border-[#E8E8E8] p-8 shadow-lg">
            <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">
              {commonQuestions[currentIndex].title}
            </h3>
            <p className="text-base text-gray-600 leading-relaxed">
              {commonQuestions[currentIndex].answer}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Dots indicator */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
        {commonQuestions.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-8 bg-[#1A1A1A]"
                : "w-2 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

