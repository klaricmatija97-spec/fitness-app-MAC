"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Dark-themed food images
const FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1920&h=1080&fit=crop&q=80", // Healthy bowl
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&h=1080&fit=crop&q=80", // Fresh ingredients
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop&q=80", // Plated food
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1920&h=1080&fit=crop&q=80", // Veggie bowl
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=1920&h=1080&fit=crop&q=80", // Kitchen prep
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1920&h=1080&fit=crop&q=80", // Healthy spread
];

interface MealPlanWelcomeScreenProps {
  onNavigate: () => void;
}

export default function MealPlanWelcomeScreen({ onNavigate }: MealPlanWelcomeScreenProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Rotate background images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % FOOD_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden min-h-[600px]">
      {/* Rotating Background Images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${FOOD_IMAGES[currentImageIndex]})` }}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/75" />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/70" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 py-12 max-w-4xl mx-auto text-center">
        {/* CORPEX Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <span className="text-xl font-black tracking-[0.4em] text-white/90">
            CORPEX
          </span>
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="space-y-6"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            DOBRODOŠLI U GENERATOR VAŠEG SEDMODNEVNOG PLANA PREHRANE
          </h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="text-lg md:text-xl text-white/80 leading-relaxed max-w-3xl mx-auto"
          >
            Generator na temelju vaših osobnih preferencija bira namirnice i isporučuje 
            sedmodnevni jelovnik sukladno vašim dnevnim kalorijskim potrebama i vašim 
            izračunatim makronutrijentima.
          </motion.p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="mt-12"
        >
          <motion.button
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 0 40px rgba(255,255,255,0.3)" 
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onNavigate}
            className="px-12 py-5 bg-transparent border-2 border-white/60 text-white text-lg font-semibold rounded-2xl 
                       hover:border-white hover:bg-white/10 transition-all duration-300
                       backdrop-blur-sm"
          >
            IDI NA PLAN PREHRANE
          </motion.button>
        </motion.div>

        {/* Decorative dots indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 2 }}
          className="flex gap-2 mt-8"
        >
          {FOOD_IMAGES.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? "bg-white w-6" 
                  : "bg-white/40"
              }`}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

