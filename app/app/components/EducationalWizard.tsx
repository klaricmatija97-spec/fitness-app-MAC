"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface EducationalStep {
slideId: string;
title: string;
subtitle?: string;
body: string;
points: string[];
ctaText?: string;
topLeftImage: string;
bottomRightImage: string;
}

// Array sa svim koracima edukativnog wizarda - PRAZNO (svi slajdovi izbrisani)
const educationalSteps: EducationalStep[] = [];

interface EducationalWizardProps {
onComplete?: () => void;
onNext?: () => void;
onBack?: () => void;
}

export default function EducationalWizard({ onComplete, onNext, onBack }: EducationalWizardProps) {
const [currentStep, setCurrentStep] = useState(0);
const [imagesLoaded, setImagesLoaded] = useState({ topLeft: false, bottomRight: false });
const [isAnimating, setIsAnimating] = useState(false);

// Ako nema slajdova, odmah završi wizard
useEffect(() => {
if (educationalSteps.length === 0) {
onComplete?.();
}
}, [onComplete]);

// Ako nema slajdova, ne renderaj ništa
if (educationalSteps.length === 0) {
return null;
}

const step = educationalSteps[currentStep];
const isFirstStep = currentStep === 0;
const isLastStep = currentStep === educationalSteps.length - 1;

// Učitaj slike za trenutni korak
useEffect(() => {
setImagesLoaded({ topLeft: false, bottomRight: false });
setIsAnimating(true);

const img1 = new Image();
img1.src = step.topLeftImage;
img1.onload = () => {
setImagesLoaded(prev => ({ ...prev, topLeft: true }));
setIsAnimating(false);
};

const img2 = new Image();
img2.src = step.bottomRightImage;
img2.onload = () => {
setImagesLoaded(prev => ({ ...prev, bottomRight: true }));
setIsAnimating(false);
};
}, [currentStep, step]);

const handleNext = () => {
if (isLastStep) {
onComplete?.();
onNext?.();
return;
}
if (!isAnimating) {
setCurrentStep(prev => prev + 1);
}
};

const handlePrev = () => {
if (!isFirstStep && !isAnimating) {
setCurrentStep(prev => prev - 1);
}
};

// Castamo na any da TypeScript ne prigovara za Easing tip
const easeCubic = [0.22, 0.61, 0.36, 1] as any;

return (
<div
className="relative w-full h-full min-h-screen overflow-hidden bg-[#0d0d0f]"
style={{ willChange: "transform, opacity, filter", contain: "layout paint" }}
>
{/* 2x2 Grid - 4 kvadrata - FIXED LAYOUT */}
<div className="grid grid-cols-2 grid-rows-2 h-screen w-full">
{/* Gore lijevo: SLIKA s Ken Burns efektom */}
<AnimatePresence mode="wait">
<motion.div
key={`topLeft-${currentStep}`}
initial={{ opacity: 0 }}
animate={{
opacity: imagesLoaded.topLeft ? 1 : 0,
scale: imagesLoaded.topLeft ? [1, 1.05] : 1,
x: imagesLoaded.topLeft ? [0, -15] : 0,
y: imagesLoaded.topLeft ? [0, -10] : 0,
}}
exit={{ opacity: 0 }}
transition={{
opacity: { duration: 0.6, ease: "easeOut" },
scale: { duration: 10, ease: "linear", repeat: Infinity, repeatType: "reverse" as const },
x: { duration: 12, ease: "linear", repeat: Infinity, repeatType: "reverse" as const },
y: { duration: 8, ease: "linear", repeat: Infinity, repeatType: "reverse" as const },
}}
className="relative overflow-hidden rounded-br-3xl"
>
<div
className="absolute inset-0 bg-cover bg-center"
style={{
backgroundImage: `url(${step.topLeftImage})`,
backgroundSize: "120%",
}}
/>
<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
</motion.div>
</AnimatePresence>

{/* Gore desno: TEKST s fade animacijom */}
<AnimatePresence mode="wait">
<motion.div
key={`topRight-${currentStep}`}
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
transition={{ duration: 0.6, ease: easeCubic }}
className="relative bg-[#0d0d0f] p-6 sm:p-8 lg:p-12 flex flex-col justify-center overflow-hidden rounded-bl-3xl"
>
<div className="absolute top-0 right-0 w-64 h-64 bg-[#4B0082]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
<div className="absolute bottom-0 left-0 w-48 h-48 bg-[#3b82f6]/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

<div className="relative z-10">
{/* Label/Tag */}
<motion.div
initial={{ opacity: 0, y: -20, scale: 0.95 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
transition={{ duration: 0.5, delay: 0.1, ease: easeCubic }}
className="mb-6"
>
<span className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/90 to-purple-500/90 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold tracking-wider uppercase border border-purple-400/30 shadow-lg">
Program prehrane
</span>
</motion.div>

{/* Subtitle */}
{step.subtitle && (
<motion.p
initial={{ opacity: 0, y: 15 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5, delay: 0.25, ease: easeCubic }}
className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#A9B1B8] mb-4 font-medium"
style={{ fontFamily: "var(--font-inter), sans-serif" }}
>
{step.subtitle}
</motion.p>
)}

{/* Title */}
<motion.h2
initial={{ opacity: 0, y: 15 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, delay: 0.4, ease: easeCubic }}
className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight"
style={{ fontFamily: "var(--font-inter), sans-serif" }}
>
{step.title}
</motion.h2>

{/* Body */}
<motion.p
initial={{ opacity: 0, y: 15 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5, delay: 0.55, ease: easeCubic }}
className="text-sm sm:text-base lg:text-lg text-[#E5E7EB] leading-relaxed"
style={{ fontFamily: "var(--font-inter), sans-serif" }}
>
{step.body}
</motion.p>
</div>
</motion.div>
</AnimatePresence>

{/* Dolje lijevo: TEKST s fade animacijom */}
<AnimatePresence mode="wait">
<motion.div
key={`bottomLeft-${currentStep}`}
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
transition={{ duration: 0.6, delay: 0.1, ease: easeCubic }}
className="relative bg-[#0d0d0f] p-6 sm:p-8 lg:p-12 flex flex-col justify-center overflow-hidden rounded-tr-3xl"
>
<div className="absolute top-0 left-0 w-48 h-48 bg-[#4B0082]/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
<div className="absolute bottom-0 right-0 w-64 h-64 bg-[#3b82f6]/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

<div className="relative z-10">
{step.points.length > 0 && (
<ul className="space-y-4 sm:space-y-5">
{step.points.map((point, idx) => (
<motion.li
key={idx}
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
transition={{
duration: 0.4,
delay: 0.7 + idx * 0.1,
ease: easeCubic
}}
className="text-sm sm:text-base lg:text-lg text_WHITE flex items-start gap-3"
style={{ fontFamily: "var(--font-inter), sans-serif" }}
>
<span className="text-[#4B0082] mt-1.5 font-bold text-xl flex-shrink-0">•</span>
<span className="leading-relaxed">{point}</span>
</motion.li>
))}
</ul>
)}

{step.ctaText && (
<motion.button
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
transition={{
duration: 0.4,
delay: 0.7 + (step.points.length * 0.1) + 0.3,
ease: easeCubic,
}}
whileHover={{
scale: 1.03,
boxShadow: "0 8px 30px rgba(107, 70, 193, 0.5)",
}}
whileTap={{ scale: 0.98 }}
className="mt-8 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold text-sm sm:text-base tracking-wide shadow-xl hover:shadow-2xl transition-all duration-300 w-fit"
style={{ fontFamily: "var(--font-inter), sans-serif" }}
>
{step.ctaText}
</motion.button>
)}
</div>
</motion.div>
</AnimatePresence>

{/* Dolje desno: SLIKA s fade animacijom */}
<AnimatePresence mode="wait">
<motion.div
key={`bottomRight-${currentStep}`}
initial={{ opacity: 0, x: 30 }}
animate={{
opacity: imagesLoaded.bottomRight ? 1 : 0,
x: imagesLoaded.bottomRight ? 0 : 30,
scale: imagesLoaded.bottomRight ? [1, 1.05] : 1,
y: imagesLoaded.bottomRight ? [0, -10] : 0,
}}
exit={{ opacity: 0, x: -30 }}
transition={{
opacity: { duration: 0.6, ease: "easeOut" },
x: { duration: 0.5, ease: easeCubic },
scale: { duration: 10, ease: "linear", repeat: Infinity, repeatType: "reverse" as const },
y: { duration: 8, ease: "linear", repeat: Infinity, repeatType: "reverse" as const },
}}
className="relative overflow-hidden rounded-tl-3xl"
>
<div
className="absolute inset-0 bg-cover bg-center"
style={{
backgroundImage: `url(${step.bottomRightImage})`,
backgroundSize: "120%",
}}
/>
<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
</motion.div>
</AnimatePresence>
</div>

{/* Navigation Arrows - FIXED POSITION */}
<div className="absolute inset-0 pointer-events-none z-[100]">
{/* Left Arrow - Prikaži uvijek (na prvom koraku vraća na prethodni slide) */}
<motion.div
className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-auto group"
initial={{ opacity: 0.7, scale: 1, x: 0 }}
animate={{ opacity: 1, scale: 1, x: 0 }}
whileHover={{ scale: 1.2, x: 10 }}
transition={{ duration: 0.3, ease: "easeOut" }}
>
<button
onClick={() => {
if (isFirstStep) {
// Na prvom koraku, vrati na prethodni slide u glavnom slideru
onBack?.();
} else {
// Na ostalim koracima, idi na prethodni korak u wizardu
handlePrev();
}
}}
disabled={isAnimating}
className="w-18 h-18 rounded-full bg-[#1A1A1A]/90 backdrop-blur-md border-2 border-[#1A1A1A] flex items-center justify-center cursor-pointer transition-all duration-300 group-hover:bg-[#1A1A1A] group-hover:border-[#1A1A1A] group-hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
aria-label={isFirstStep ? "Back to previous slide" : "Previous step"}
>
<motion.svg
className="w-9 h-9 text-white"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
whileHover={{ x: -5 }}
transition={{ duration: 0.2 }}
>
<path
strokeLinecap="round"
strokeLinejoin="round"
strokeWidth={3}
d="M15 19l-7-7 7-7"
/>
</motion.svg>
</button>
</motion.div>

{/* Right Arrow */}
<motion.div
className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-auto group"
initial={{ opacity: 0.7, scale: 1, x: 0 }}
animate={{ opacity: 1, scale: 1, x: 0 }}
whileHover={{ scale: 1.2, x: -10 }}
transition={{ duration: 0.3, ease: "easeOut" }}
>
<button
onClick={handleNext}
disabled={isAnimating}
className="w-18 h-18 rounded-full bg-[#1A1A1A]/90 backdrop-blur-md border-2 border-[#1A1A1A] flex items-center justify-center cursor-pointer transition-all duration-300 group-hover:bg-[#1A1A1A] group-hover:border-[#1A1A1A] group-hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
aria-label={isLastStep ? "Complete" : "Next step"}
>
<motion.svg
className="w-9 h-9 text-white"
fill="none"
stroke="currentColor"
viewBox="0 0 24 24"
whileHover={{ x: 5 }}
transition={{ duration: 0.2 }}
>
<path
strokeLinecap="round"
strokeLinejoin="round"
strokeWidth={3}
d="M9 5l7 7-7 7"
/>
</motion.svg>
</button>
</motion.div>
</div>

{/* Step Indicators */}
<div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100] flex gap-2">
{educationalSteps.map((_, idx) => (
<motion.div
key={idx}
className={`h-2 rounded-full transition-all duration-300 ${
idx === currentStep
? "w-8 bg-purple-500"
: "w-2 bg-white/30"
}`}
initial={{ scale: 0.8 }}
animate={{ scale: idx === currentStep ? 1 : 0.8 }}
transition={{ duration: 0.3 }}
/>
))}
</div>
</div>
);
}