"use client";

import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Dark-themed fitness/health images
const CALCULATOR_IMAGES = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop&q=80", // Gym equipment
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&h=1080&fit=crop&q=80", // Workout
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&h=1080&fit=crop&q=80", // Fitness
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1920&h=1080&fit=crop&q=80", // Healthy lifestyle
  "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1920&h=1080&fit=crop&q=80", // Running
];

interface CalculatorScreenProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
  onBack?: () => void;
}

export default function CalculatorScreen({ 
  children, 
  title, 
  subtitle,
  step,
  totalSteps = 4,
  onBack 
}: CalculatorScreenProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBackArrow, setShowBackArrow] = useState(false);

  // Rotate background images every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CALCULATOR_IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
      {/* Solid black base */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Rotating Background Images */}
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
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${CALCULATOR_IMAGES[currentImageIndex]})`,
              filter: "brightness(0.2) saturate(0.7)"
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

      {/* Back Arrow */}
      {onBack && (
        <motion.div
          className="fixed left-6 md:left-10 top-1/2 -translate-y-1/2 z-[60]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: showBackArrow ? 1 : 0.5,
            x: 0,
            scale: showBackArrow ? 1.1 : 1
          }}
          transition={{ duration: 0.3, delay: 0.3 }}
          onMouseEnter={() => setShowBackArrow(true)}
          onMouseLeave={() => setShowBackArrow(false)}
        >
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.15, x: -5 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/20 hover:border-white/40"
            aria-label="Nazad"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>
        </motion.div>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-8 flex flex-col items-center min-h-screen overflow-y-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-8 flex-shrink-0"
        >
          {/* CORPEX Logo */}
          <span className="text-xs md:text-sm font-light tracking-[0.5em] text-white/50 uppercase block mb-6">
            Corpex
          </span>
          
          {/* Step indicator */}
          {step && (
            <div className="flex items-center justify-center gap-2 mb-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i + 1 === step 
                      ? "w-8 bg-white" 
                      : i + 1 < step 
                        ? "w-4 bg-white/60" 
                        : "w-4 bg-white/20"
                  }`}
                />
              ))}
            </div>
          )}
          
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-2xl md:text-3xl lg:text-4xl font-light text-white tracking-wide"
          >
            {title}
          </motion.h1>
          
          {/* Subtitle */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-sm md:text-base text-white/50 mt-3 font-light max-w-xl mx-auto"
            >
              {subtitle}
            </motion.p>
          )}
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent mb-8 flex-shrink-0"
        />

        {/* Calculator Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="w-full flex-1 flex flex-col"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

// ========================================
// SUB-COMPONENTS FOR CALCULATOR UI
// ========================================

interface CalcCardProps {
  children: ReactNode;
  className?: string;
  highlighted?: boolean;
}

export function CalcCard({ children, className = "", highlighted = false }: CalcCardProps) {
  return (
    <div className={`
      rounded-2xl p-6 backdrop-blur-md transition-all duration-300
      ${highlighted 
        ? "bg-white/15 border border-white/30 shadow-lg shadow-white/5" 
        : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
      }
      ${className}
    `}>
      {children}
    </div>
  );
}

interface CalcInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  unit?: string;
}

export function CalcInput({ label, value, onChange, type = "text", placeholder, unit }: CalcInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-light text-white/70 tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 
                     focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all duration-300
                     font-light tracking-wide"
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">{unit}</span>
        )}
      </div>
    </div>
  );
}

interface CalcSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function CalcSelect({ label, value, onChange, options }: CalcSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-light text-white/70 tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white 
                   focus:outline-none focus:border-white/50 focus:bg-white/10 transition-all duration-300
                   font-light tracking-wide appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5rem' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CalcButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "success";
  disabled?: boolean;
  className?: string;
}

export function CalcButton({ children, onClick, variant = "primary", disabled = false, className = "" }: CalcButtonProps) {
  const variants = {
    primary: "bg-transparent border-2 border-white/40 text-white hover:bg-white/10 hover:border-white/60",
    secondary: "bg-white/5 border border-white/20 text-white/80 hover:bg-white/10",
    success: "bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30",
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        w-full py-4 rounded-xl font-light tracking-wide transition-all duration-300
        ${variants[variant]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}

interface CalcResultProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export function CalcResult({ label, value, unit, highlight = false }: CalcResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        rounded-2xl p-6 text-center
        ${highlight 
          ? "bg-gradient-to-br from-white/15 to-white/5 border border-white/30" 
          : "bg-white/5 border border-white/10"
        }
      `}
    >
      <div className="text-sm text-white/50 mb-2 font-light tracking-wide">{label}</div>
      <div className="text-4xl md:text-5xl font-light text-white tracking-tight">{value}</div>
      {unit && <div className="text-sm text-white/40 mt-2 font-light">{unit}</div>}
    </motion.div>
  );
}

interface CalcInfoCardProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function CalcInfoCard({ title, children, icon }: CalcInfoCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all duration-300">
      <div className="flex items-start gap-3">
        {icon && <div className="text-white/60 mt-0.5">{icon}</div>}
        <div>
          <h3 className="text-base font-medium text-white/90 mb-2">{title}</h3>
          <div className="text-sm text-white/50 leading-relaxed font-light">{children}</div>
        </div>
      </div>
    </div>
  );
}

