type PlanGoal =
  | "lose-fat"
  | "gain-muscle"
  | "recomp"
  | "power"
  | "endurance"
  | "speed";

export type PlanPreset = {
  id: string;
  title: string;
  goal: PlanGoal;
  activityFocus: string;
  duration: string;
  format: "pdf" | "sheet" | "video";
  level: "beginner" | "intermediate" | "advanced";
  description: string;
  downloadUrl: string;
};

export const mealPlanPresets: PlanPreset[] = [
  {
    id: "mp-1",
    title: "Metabolički Reset · Mediteranska",
    goal: "recomp",
    activityFocus: "weight-training",
    duration: "7-dnevna rotacija",
    format: "pdf",
    level: "beginner",
    description:
      "Uravnoteženi makronutrijenti, hrana bogata bojama i gotovi popisi za kupovinu za klijente koji trebaju energiju bez praćenja.",
    downloadUrl: "#",
  },
  {
    id: "mp-2",
    title: "Lean Atlet · Visoki Protein",
    goal: "lose-fat",
    activityFocus: "running",
    duration: "14-dnevna rotacija",
    format: "sheet",
    level: "intermediate",
    description:
      "40/30/30 makro podjela, zamjene shake-ova i opcijski prozori posta za zaposlene profesionalce.",
    downloadUrl: "#",
  },
  {
    id: "mp-3",
    title: "Biljna Prehrana za Rast Mišića",
    goal: "gain-muscle",
    activityFocus: "lifting-weights",
    duration: "10-dnevna rotacija",
    format: "pdf",
    level: "intermediate",
    description:
      "Veganski recepti s višim izvorima leucina, pametna suplementacija i upute za pripremu većih količina.",
    downloadUrl: "#",
  },
];

export const trainingPlanPresets: PlanPreset[] = [
  {
    id: "tp-1",
    title: "Atletski Temelji (3x/tjedno)",
    goal: "recomp",
    activityFocus: "basketball",
    duration: "6 tjedana",
    format: "pdf",
    level: "beginner",
    description:
      "Cjelotjelovne sesije s tempom, vježbama slijetanja i mobilnostnim pripremama. Savršeno kao početni predložak.",
    downloadUrl: "#",
  },
  {
    id: "tp-2",
    title: "Power Build Split (Gornji / Donji)",
    goal: "power",
    activityFocus: "weight-training",
    duration: "8 tjedana",
    format: "sheet",
    level: "advanced",
    description:
      "Dnevna varijabilna periodizacija sa speed pullovima, kontrastnim serijama i RPE-baziranim progresijama.",
    downloadUrl: "#",
  },
  {
    id: "tp-3",
    title: "Endurance Lab (Zona 2 + HIIT)",
    goal: "endurance",
    activityFocus: "running",
    duration: "5 tjedana",
    format: "video",
    level: "intermediate",
    description:
      "Kardio predlošci s uputama za praćenje srčanog ritma, brick sesijama i tehničkim trkaćim vježbama.",
    downloadUrl: "#",
  },
];
