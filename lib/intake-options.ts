export const honorificOptions = [
  { value: "mrs", label: "Mrs" },
  { value: "ms", label: "Ms" },
  { value: "mr", label: "Mr" },
  { value: "other", label: "Other" },
] as const;

export const ageOptions = [
  { value: "10-20", label: "10 – 20" },
  { value: "20-30", label: "20 – 30" },
  { value: "30-40", label: "30 – 40" },
  { value: "40-50", label: "40 – 50" },
  { value: "50-60", label: "50 – 60" },
  { value: "60-70", label: "60 – 70" },
  { value: "70+", label: "70+" },
  { value: "other", label: "Ostalo" },
] as const;

export const activityOptions = [
  { value: "running", label: "Trčanje" },
  { value: "weight-training", label: "Trening s tegovima" },
  { value: "climbing", label: "Penjanje" },
  { value: "football", label: "Nogomet" },
  { value: "basketball", label: "Košarka" },
  { value: "boxing", label: "Boks" },
  { value: "padel", label: "Padel" },
  { value: "tennis", label: "Tenis" },
  { value: "swimming", label: "Plivanje" },
  { value: "lifting-weights", label: "Dizanje utega" },
  { value: "other", label: "Ostalo" },
] as const;

export const goalOptions = [
  { value: "recomp", label: "Smanjiti masnoću + dobiti mišiće" },
  { value: "lose-fat", label: "Smanjiti masnoću" },
  { value: "gain-muscle", label: "Dobiti mišiće" },
  { value: "power", label: "Postati snažniji" },
  { value: "endurance", label: "Izdržljivost" },
  { value: "speed", label: "Brzina i eksplozivnost" },
  { value: "learn-gym", label: "Naučiti trenirati i osjećati se odlično" },
  { value: "other", label: "Ostalo" },
] as const;

export const weightUnits = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
] as const;

export const heightUnits = [
  { value: "cm", label: "cm" },
  { value: "in", label: "inch" },
] as const;

// Nove opcije za prošireni onboarding
export const trainingFrequencyOptions = [
  { value: "1", label: "1 put tjedno" },
  { value: "2", label: "2 puta tjedno" },
  { value: "3", label: "3 puta tjedno" },
  { value: "4", label: "4 puta tjedno" },
  { value: "5", label: "5 puta tjedno" },
  { value: "6", label: "6 puta tjedno" },
  { value: "7", label: "7 puta tjedno (svaki dan)" },
] as const;

export const trainingDurationOptions = [
  { value: "20-30", label: "20–30 minuta" },
  { value: "30-45", label: "30–45 minuta" },
  { value: "45-60", label: "45–60 minuta" },
  { value: "60+", label: "60+ minuta" },
] as const;

export const trainingLocationOptions = [
  { value: "gym", label: "Teretana" },
  { value: "home", label: "Kuća" },
  { value: "outdoor", label: "Vani" },
] as const;

export const equipmentOptions = [
  { value: "dumbbells", label: "Bučice" },
  { value: "barbell-weights", label: "Šipka/utezi" },
  { value: "resistance-bands", label: "Elastične trake" },
  { value: "machines", label: "Mašine/sprave" },
  { value: "none", label: "Ništa od navedenog" },
] as const;

export const experienceLevelOptions = [
  { value: "beginner", label: "Početnik" },
  { value: "intermediate", label: "Srednji" },
  { value: "advanced", label: "Napredni" },
] as const;

export const mealFrequencyOptions = [
  { value: "3", label: "3 obroka" },
  { value: "5", label: "5 obroka" },
  { value: "6", label: "6 obroka" },
] as const;

export const dietTypeOptions = [
  { value: "none", label: "Bez posebnog režima" },
  { value: "vegetarian", label: "Vegetarijanac" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "gluten-free", label: "Bezglutenska" },
  { value: "low-carb", label: "Low-carb" },
  { value: "other", label: "Drugo" },
] as const;

export const biggestChallengeOptions = [
  { value: "time", label: "Nedostatak vremena" },
  { value: "nutrition", label: "Prehrana" },
  { value: "motivation", label: "Motivacija" },
  { value: "technique", label: "Tehnika vježbi" },
  { value: "other", label: "Nešto drugo" },
] as const;

export type Honorific = (typeof honorificOptions)[number]["value"];
export type AgeBucket = (typeof ageOptions)[number]["value"];
export type ActivityPreference = (typeof activityOptions)[number]["value"];
export type GoalPreference = (typeof goalOptions)[number]["value"];
export type WeightUnit = (typeof weightUnits)[number]["value"];
export type HeightUnit = (typeof heightUnits)[number]["value"];
export type TrainingFrequency = (typeof trainingFrequencyOptions)[number]["value"];
export type TrainingDuration = (typeof trainingDurationOptions)[number]["value"];
export type TrainingLocation = (typeof trainingLocationOptions)[number]["value"];
export type EquipmentPreference = (typeof equipmentOptions)[number]["value"];
export type ExperienceLevel = (typeof experienceLevelOptions)[number]["value"];
export type MealFrequency = (typeof mealFrequencyOptions)[number]["value"];
export type DietType = (typeof dietTypeOptions)[number]["value"];
export type BiggestChallenge = (typeof biggestChallengeOptions)[number]["value"];

