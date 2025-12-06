"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

// Jedna slika - trening na plaži (California)
const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&h=1080&fit=crop&q=80";

interface HonorificOption {
  value: string;
  label: string;
}

interface HonorificSlideProps {
  intakeForm: { honorific: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateIntakeForm: (field: string, value: any) => void;
  honorificOptions: readonly HonorificOption[];
}

// Rodni simboli za odabir
const genderSymbols = [
  { value: "mr", symbol: "♂", label: "Muško" },
  { value: "mrs", symbol: "♀", label: "Žensko" },
  { value: "other", symbol: "⚥", label: "Ostalo" },
];

export default function HonorificSlide({
  intakeForm,
  updateIntakeForm,
}: HonorificSlideProps) {
  const [step, setStep] = useState(0);

  // Animacija
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      {/* Pozadinska slika - trening na plaži */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          filter: "brightness(0.3) saturate(0.8)",
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

      {/* CORPEX logo - gore */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-20 text-xs font-light tracking-[0.5em] text-white/40 uppercase"
      >
        Corpex
      </motion.p>

      {/* Sadržaj - centriran */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-xl text-center">

          {/* Rodni simboli */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 20 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center gap-12 md:gap-16"
            data-no-swipe="true"
          >
            {genderSymbols.map((item, i) => (
              <motion.button
                key={item.value}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: step >= 2 ? 1 : 0, scale: step >= 2 ? 1 : 0.8 }}
                transition={{ duration: 0.4, delay: i * 0.15 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => updateIntakeForm("honorific", item.value)}
                className="flex flex-col items-center gap-3 group"
              >
                <span
                  className={clsx(
                    "text-7xl md:text-8xl transition-all duration-300",
                    intakeForm.honorific === item.value
                      ? "text-purple-400 drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]"
                      : "text-white group-hover:text-purple-300"
                  )}
                >
                  {item.symbol}
                </span>
                <span
                  className={clsx(
                    "text-base font-light tracking-wider transition-all duration-300",
                    intakeForm.honorific === item.value
                      ? "text-purple-400"
                      : "text-white/60 group-hover:text-white"
                  )}
                >
                  {item.label}
                </span>
              </motion.button>
            ))}
          </motion.div>

        </div>
      </div>
    </div>
  );
}

