"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface EducationalOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Slide {
  id: number;
  pattern: "A" | "B" | "final";
  title: string;
  body: string;
  subtitle?: string;
  points?: string[];
  badge?: string;
}

const slides: Slide[] = [
  {
    id: 1,
    pattern: "A",
    title: "Trening nije samo znoj — to je ulaganje u zdravlje.",
    body: "Većina ljudi misli da moraju 'razvaljivati' svaki trening da bi vidjeli rezultat — ali napredak dolazi iz dosljednosti, a ne ekstremnosti. Trening postaje normalna rutina kao pranje zuba.",
    subtitle: "Šta želiš prvo poboljšati: energiju, izgled, zdravlje ili disciplinu?",
  },
  {
    id: 2,
    pattern: "B",
    title: "Nećeš se 'nabildati' preko noći.",
    body: "Mišići ne rastu brzo, posebno kod žena. Trening te ne čini 'prevelikom', nego snažnijom, zategnutijom i zdravijom. Dovoljno je 30–45 min pametnog rada.",
    subtitle: "Šta ti je bitnije: snaga, definicija ili kondicija?",
    badge: "Mit #1",
  },
  {
    id: 3,
    pattern: "A",
    title: "Trening rješava većinu svakodnevnih problema.",
    body: "",
    points: [
      "Bolja koncentracija – 20 minuta treninga poboljšava fokus.",
      "Manje stresa – trening pomaže regulisati hormone.",
      "Bolji san – tijelo se regenerira nakon aktivnosti.",
    ],
  },
  {
    id: 4,
    pattern: "B",
    title: "Trening postaje stil života — ne obaveza.",
    body: "Teretana nije mjesto gdje te neko gleda. Svi su fokusirani na sebe. Kad treniraš redovno, postaješ sigurniji, smireniji i osoba koja se ne preispituje — to postane normalan dio života.",
    points: [
      "Trening gradi unutrašnju snagu",
      "Podiže dopamin",
      "Ljudi te više poštuju kad vide da se brineš o sebi",
    ],
  },
  {
    id: 5,
    pattern: "A",
    title: "Poslije 28. godine tijelu treba pomoć da ostane snažno.",
    body: "Prirodni rast i metabolizam usporavaju. Bez treninga snage gubi se mišić, energija i funkcionalnost. Teretana čuva mladost, zdravlje i dugovječnost.",
    subtitle: "Najveća korist treninga nije izgled — nego funkcionalnost i život bez bolova.",
  },
  {
    id: 6,
    pattern: "B",
    title: "Prehrana te ne sabotira — sabotira te način pripreme.",
    body: "Najveća greška: izgladnjivanje tokom dana, pa prejedanje navečer. Prženje, ulja i dodaci često povećaju kalorije više nego sama hrana. Vaga ti pomaže da naučiš prave porcije.",
    points: [
      "Izbaci loše namirnice iz kuće",
      "Whey + voće protiv želje za slatkim",
      "Jednostavno i održivo pobjeđuje",
    ],
  },
  {
    id: 7,
    pattern: "A",
    title: "Stres, san i navike — bez ovoga nema napretka.",
    body: "Zdravlje je balans. Loš san, stres i posao koji nosiš kući usporavaju rezultate. Odmor, sauna, šetnje i vrijeme za sebe jednako su važni kao i trening.",
    points: [
      "Odmor je dio napretka",
      "Ne uspoređuj se s drugima",
      "Dosljednost > savršenstvo",
    ],
  },
  {
    id: 8,
    pattern: "final",
    title: "Kroz ovaj upitnik ću razumjeti šta ti stvarno treba.",
    body: "Na osnovu tvojih odgovora CORPEX će ti dati preporuke za tvoj život, cilj i tempo — bez univerzalnih 'copy-paste' planova.",
    badge: "SPREMNI ZA SLJEDEĆI KORAK",
  },
];

export default function EducationalOnboarding({ onComplete, onSkip }: EducationalOnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = () => {
    if (isLastSlide) {
      handleComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstSlide) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("educationalOnboardingCompleted", "true");
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("educationalOnboardingCompleted", "true");
    onSkip();
  };

  // Pattern A: Top-left image, bottom-right text card
  const renderPatternA = () => (
    <div className="relative h-full w-full p-6 grid grid-cols-2 grid-rows-2 gap-6">
      {/* Top-left: Image block */}
      <div className="relative col-span-1 row-span-1 rounded-[12px] overflow-hidden bg-gradient-to-br from-[#4B0082]/20 to-[#0D0F10] border border-[rgba(255,255,255,0.1)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-[#4B0082]/30 flex items-center justify-center">
            <svg className="w-12 h-12 text-[#4B0082]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Top-right: Empty or badge */}
      {slide.badge && (
        <div className="col-span-1 row-span-1 flex items-start justify-end">
          <div className="rounded-[8px] bg-[#4B0082]/20 backdrop-blur-md border border-[#4B0082]/40 px-3 py-2">
            <p className="text-xs font-semibold text-[#4B0082] uppercase tracking-wider" style={{ fontFamily: "var(--font-inter), sans-serif" }}>{slide.badge}</p>
          </div>
        </div>
      )}

      {/* Bottom-left: Empty */}
      <div className="col-span-1 row-span-1" />

      {/* Bottom-right: Main text card */}
      <div className="col-span-1 row-span-1 flex items-end justify-end">
        <div className="rounded-[12px] bg-[rgba(255,255,255,0.08)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] p-6 w-full max-w-md shadow-lg">
          <h2 className="text-[26px] font-semibold text-[#F4F4F4] mb-4 leading-tight" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            {slide.title}
          </h2>
          {slide.body && (
            <p className="text-[16px] text-[#A9B1B8] mb-4 leading-relaxed" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              {slide.body}
            </p>
          )}
          {slide.subtitle && (
            <p className="text-[14px] text-[#A9B1B8]/80 italic" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              {slide.subtitle}
            </p>
          )}
          {slide.points && (
            <ul className="space-y-3 mt-4">
              {slide.points.map((point, idx) => (
                <li key={idx} className="text-[14px] text-[#A9B1B8] flex items-start gap-3" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                  <span className="text-[#4B0082] mt-1 font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  // Pattern B: Top-right image, bottom-left text card
  const renderPatternB = () => (
    <div className="relative h-full w-full p-6 grid grid-cols-2 grid-rows-2 gap-6">
      {/* Top-left: Badge */}
      {slide.badge && (
        <div className="col-span-1 row-span-1 flex items-start justify-start">
          <div className="rounded-[8px] bg-[#4B0082]/20 backdrop-blur-md border border-[#4B0082]/40 px-3 py-2">
            <p className="text-xs font-semibold text-[#4B0082] uppercase tracking-wider" style={{ fontFamily: "var(--font-inter), sans-serif" }}>{slide.badge}</p>
          </div>
        </div>
      )}

      {/* Top-right: Image block */}
      <div className="relative col-span-1 row-span-1 rounded-[12px] overflow-hidden bg-gradient-to-bl from-[#4B0082]/20 to-[#0D0F10] border border-[rgba(255,255,255,0.1)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-[#4B0082]/30 flex items-center justify-center">
            <svg className="w-12 h-12 text-[#4B0082]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom-left: Main text card */}
      <div className="col-span-1 row-span-1 flex items-end justify-start">
        <div className="rounded-[12px] bg-[rgba(255,255,255,0.08)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] p-6 w-full max-w-md shadow-lg">
          <h2 className="text-[26px] font-semibold text-[#F4F4F4] mb-4 leading-tight" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            {slide.title}
          </h2>
          {slide.body && (
            <p className="text-[16px] text-[#A9B1B8] mb-4 leading-relaxed" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              {slide.body}
            </p>
          )}
          {slide.subtitle && (
            <p className="text-[14px] text-[#A9B1B8]/80 italic" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              {slide.subtitle}
            </p>
          )}
          {slide.points && (
            <ul className="space-y-3 mt-4">
              {slide.points.map((point, idx) => (
                <li key={idx} className="text-[14px] text-[#A9B1B8] flex items-start gap-3" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                  <span className="text-[#4B0082] mt-1 font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom-right: Empty */}
      <div className="col-span-1 row-span-1" />
    </div>
  );

  // Final slide: Centered layout
  const renderFinalSlide = () => (
    <div className="relative h-full w-full flex items-center justify-center p-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4B0082]/10 via-[#0D0F10] to-[#4B0082]/5" />
      
      {/* Centered card */}
      <div className="relative z-10 max-w-lg w-full">
        <div className="rounded-[12px] bg-[rgba(255,255,255,0.08)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] p-8 shadow-xl text-center">
          {slide.badge && (
            <div className="mb-6 inline-block">
              <div className="rounded-[8px] bg-[#4B0082]/20 backdrop-blur-md border border-[#4B0082]/40 px-4 py-2">
                <p className="text-xs font-semibold text-[#4B0082] uppercase tracking-wider" style={{ fontFamily: "var(--font-inter), sans-serif" }}>{slide.badge}</p>
              </div>
            </div>
          )}
          <h2 className="text-[36px] font-bold text-[#F4F4F4] mb-6 leading-tight" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            {slide.title}
          </h2>
          <p className="text-[16px] text-[#A9B1B8] leading-relaxed" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            {slide.body}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0F10] flex flex-col">
      {/* Header with CORPEX logo and Skip button */}
      <div className="flex-shrink-0 px-6 py-5 flex items-center justify-between border-b border-gray-800 bg-[#0D0F10]">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
          CORP<span className="text-purple-400">EX</span>
        </h1>
        <button
          onClick={handleSkip}
          className="px-4 py-2 rounded-[8px] text-sm font-medium text-[#A9B1B8] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all"
          style={{ fontFamily: "var(--font-inter), sans-serif" }}
        >
          Preskoči
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-hidden relative bg-[#0D0F10]">
        <AnimatePresence mode="wait" custom={currentSlide}>
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            {slide.pattern === "A" && renderPatternA()}
            {slide.pattern === "B" && renderPatternB()}
            {slide.pattern === "final" && renderFinalSlide()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with pagination dots and Next/Start button */}
      <div className="flex-shrink-0 px-6 py-6 border-t border-gray-800 bg-[#0D0F10]">
        <div className="flex items-center justify-between">
          {/* Pagination dots */}
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <motion.div
                key={idx}
                className={clsx(
                  "h-2 rounded-full transition-all duration-300",
                  idx === currentSlide
                    ? "w-7 bg-[#4B0082] shadow-lg"
                    : "w-2 bg-gray-700"
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {/* Back button - only show if not first slide */}
            {!isFirstSlide && (
              <button
                onClick={handlePrevious}
                className="px-6 py-3 rounded-[12px] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.2)] text-[#F4F4F4] font-semibold text-base hover:bg-[rgba(255,255,255,0.12)] active:scale-[0.97] transition-all"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Natrag
              </button>
            )}
            
            {/* Next/Start button */}
            <button
              onClick={handleNext}
              className="px-8 py-3 rounded-[12px] bg-[#4B0082] text-white font-semibold text-base shadow-[0px_4px_20px_rgba(75,0,130,0.3)] hover:bg-[#5A1A92] active:scale-[0.97] transition-all"
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {isLastSlide ? "Kreni" : "Dalje"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
