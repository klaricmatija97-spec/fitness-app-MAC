"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type SlideId = 
  | "login"
  | "intro"
  | "edu_wizard"
  | "honorific"
  | "age"
  | "weight"
  | "height"
  | "activities"
  | "goals"
  | "training-frequency"
  | "training-duration"
  | "training-location"
  | "equipment"
  | "experience"
  | "meal-frequency"
  | "allergies"
  | "diet-type"
  | "sleep"
  | "injuries"
  | "biggest-challenge"
  | "nutrition"
  | "calculators-intro"
  | "bmr-calc"
  | "tdee-calc"
  | "target-calc"
  | "macros"
  | "contact"
  | "meals"
  | "training"
  | "chat";

interface Slide {
  id: SlideId;
  title: string;
}

interface SlideContextType {
  slides: Slide[];
  currentSlide: number;
  setCurrentSlide: (slide: number) => void;
  setSlides: (slides: Slide[]) => void;
}

const SlideContext = createContext<SlideContextType | undefined>(undefined);

export function SlideProvider({ children }: { children: ReactNode }) {
  // Učitaj sačuvan currentSlide iz localStorage
  const getInitialSlide = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("appCurrentSlide");
      if (saved !== null) {
        const slideIndex = parseInt(saved, 10);
        if (!isNaN(slideIndex) && slideIndex >= 0) {
          return slideIndex;
        }
      }
    }
    return 0;
  };

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(getInitialSlide);

  // Sačuvaj kad god se promijeni
  const handleSetCurrentSlide = (slide: number) => {
    setCurrentSlide(slide);
    if (typeof window !== "undefined") {
      localStorage.setItem("appCurrentSlide", slide.toString());
    }
  };

  return (
    <SlideContext.Provider value={{ slides, currentSlide, setCurrentSlide: handleSetCurrentSlide, setSlides }}>
      {children}
    </SlideContext.Provider>
  );
}

export function useSlides() {
  const context = useContext(SlideContext);
  if (!context) {
    throw new Error("useSlides must be used within SlideProvider");
  }
  return context;
}


