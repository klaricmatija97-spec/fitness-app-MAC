"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

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

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
      {/* Pozadinska slika - statična, bez rotacije za smooth prijelaze */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${CALCULATOR_IMAGES[0]})`,
          filter: "brightness(0.25) saturate(0.7)"
        }}
      />

      {/* Gradient overlays - profinjeniji */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

      {/* Back Arrow - suptilniji */}
      {onBack && (
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          whileHover={{ opacity: 1, x: -3 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20"
          aria-label="Nazad"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-8 flex flex-col items-center min-h-screen overflow-y-auto">
        
        {/* Header - profinjenije animacije */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 flex-shrink-0"
        >
          {/* CORPEX Logo */}
          <span className="text-xs font-light tracking-[0.5em] text-white/40 uppercase block mb-6">
            Corpex
          </span>
          
          {/* Step indicator - suptilniji */}
          {step && (
            <div className="flex items-center justify-center gap-1.5 mb-6">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 rounded-full transition-all duration-500 ${
                    i + 1 === step 
                      ? "w-6 bg-white/80" 
                      : i + 1 < step 
                        ? "w-3 bg-white/40" 
                        : "w-3 bg-white/15"
                  }`}
                />
              ))}
            </div>
          )}
          
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-xl md:text-2xl lg:text-3xl font-light text-white tracking-wide"
          >
            {title}
          </motion.h1>
          
          {/* Subtitle */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-sm text-white/40 mt-3 font-light max-w-xl mx-auto"
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
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`
        py-4 transition-all duration-300
        ${highlighted ? "border-l-2 border-white/30 pl-4" : ""}
        ${className}
      `}
    >
      {children}
    </motion.div>
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-3"
    >
      <label className="block text-sm font-light text-white/50 tracking-wider uppercase">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xl text-white placeholder-white/20 
                     focus:outline-none focus:border-white/50 transition-all duration-300
                     font-light tracking-wide"
        />
        {unit && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-white/30 text-sm font-light">{unit}</span>
        )}
      </div>
    </motion.div>
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-3"
    >
      <label className="block text-sm font-light text-white/50 tracking-wider uppercase">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-xl text-white 
                   focus:outline-none focus:border-white/50 transition-all duration-300
                   font-light tracking-wide appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center', backgroundSize: '1.2rem' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </motion.div>
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
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ opacity: disabled ? 0.5 : 0.8 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        w-full py-3 font-light tracking-wider text-white/70 hover:text-white transition-all duration-300
        border-b border-white/20 hover:border-white/40
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="text-center py-6"
    >
      <div className="text-xs text-white/40 mb-3 font-light tracking-widest uppercase">{label}</div>
      <div className={`text-5xl md:text-6xl font-extralight text-white tracking-tight ${highlight ? "text-white" : "text-white/90"}`}>
        {value}
      </div>
      {unit && <div className="text-sm text-white/30 mt-2 font-light tracking-wide">{unit}</div>}
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="py-4 border-b border-white/10"
    >
      <div className="flex items-start gap-3">
        {icon && <div className="text-white/40 mt-0.5">{icon}</div>}
        <div>
          <h3 className="text-sm font-light text-white/70 mb-1 tracking-wide">{title}</h3>
          <div className="text-sm text-white/40 leading-relaxed font-light">{children}</div>
        </div>
      </div>
    </motion.div>
  );
}

