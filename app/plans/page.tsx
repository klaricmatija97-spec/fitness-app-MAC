"use client";

import {
  activityOptions,
  goalOptions,
} from "@/lib/intake-options";
import {
  mealPlanPresets,
  trainingPlanPresets,
} from "@/lib/plan-presets";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import clsx from "clsx";

// Besplatne sportske slike bez autorskih prava (Unsplash)
const backgroundImages = [
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80", // Measuring height
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80", // Gym weights
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80", // Gym workout
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1920&q=80", // Gym training
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1920&q=80", // Gym equipment
  "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1920&q=80", // Gym barbell
];

export default function PlansLibraryPage() {
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [currentBgImage, setCurrentBgImage] = useState(0);

  // Rotiraj pozadinske slike svakih 7 sekundi
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgImage((prev) => (prev + 1) % backgroundImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const filteredMeals = useMemo(
    () =>
      mealPlanPresets.filter(
        (plan) =>
          (goalFilter === "all" || plan.goal === goalFilter) &&
          (activityFilter === "all" || plan.activityFocus === activityFilter),
      ),
    [goalFilter, activityFilter],
  );

  const filteredTraining = useMemo(
    () =>
      trainingPlanPresets.filter(
        (plan) =>
          (goalFilter === "all" || plan.goal === goalFilter) &&
          (activityFilter === "all" || plan.activityFocus === activityFilter),
      ),
    [goalFilter, activityFilter],
  );

  return (
    <main className="relative min-h-screen bg-white text-black overflow-hidden">
      {/* Rotirajuće sportske slike u pozadini */}
      <div className="fixed inset-0 z-0">
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className={clsx(
              "absolute inset-0 transition-opacity duration-2000 ease-in-out",
              index === currentBgImage ? "opacity-50" : "opacity-0",
            )}
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        ))}
        {/* Overlay za bolju čitljivost */}
        <div className="absolute inset-0 bg-white/40" />
      </div>

      {/* Sadržaj */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <header className="space-y-6">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-gray-900 md:text-5xl" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
              CORP<span className="text-purple-400">EX</span>
            </h1>
          </div>
          <h2 className="text-3xl font-semibold text-gray-900 md:text-4xl" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
            Planovi prehrane i treninga
          </h2>
          <p className="max-w-3xl text-lg text-gray-600">
            Nakon što klijent završi upitnik, filtriraj po ciljevima ili aktivnostima i pošalji mu odgovarajući plan u nekoliko minuta. Zamijeni primjer fajlova sa svojim PDF-ovima, Google Sheet-ovima ili video linkovima.
          </p>
          <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg md:flex-row">
            <SelectField
              label="Cilj"
              value={goalFilter}
              onChange={(event) => setGoalFilter(event.target.value)}
              options={[{ value: "all", label: "Svi ciljevi" }, ...goalOptions]}
            />
            <SelectField
              label="Primarna aktivnost"
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
              options={[{ value: "all", label: "Sve aktivnosti" }, ...activityOptions]}
            />
          </div>
        </header>

        <section className="mt-12 space-y-8">
          <SectionHeading title="Planovi prehrane" />
          <div className="grid gap-6 md:grid-cols-2">
            {filteredMeals.map((plan) => (
              <PlanCard key={plan.id} {...plan} />
            ))}
            {filteredMeals.length === 0 && <EmptyState />}
          </div>
        </section>

        <section className="mt-12 space-y-8">
          <SectionHeading title="Planovi treninga" />
          <div className="grid gap-6 md:grid-cols-2">
            {filteredTraining.map((plan) => (
              <PlanCard key={plan.id} {...plan} />
            ))}
            {filteredTraining.length === 0 && <EmptyState />}
          </div>
        </section>
      </div>
    </main>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly { value: string; label: string }[];
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="flex flex-1 flex-col gap-2 text-sm text-gray-600">
      <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="rounded-2xl border border-gray-300 bg-white/80 px-4 py-3 text-base text-gray-900 focus:border-gray-900 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>{title}</h2>
    </div>
  );
}

function PlanCard({
  title,
  goal,
  activityFocus,
  duration,
  format,
  level,
  description,
  downloadUrl,
}: (typeof mealPlanPresets)[number]) {
  const goalLabel = goalOptions.find((opt) => opt.value === goal)?.label || goal;
  const activityLabel = activityOptions.find((opt) => opt.value === activityFocus)?.label || activityFocus;
  
  const levelLabels: Record<string, string> = {
    beginner: "Početnik",
    intermediate: "Srednji",
    advanced: "Napredni",
  };

  const formatLabels: Record<string, string> = {
    pdf: "PDF",
    sheet: "Google Sheet",
    video: "Video",
  };

  return (
    <article className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
        <span>{goalLabel}</span>
        <span>·</span>
        <span>{activityLabel}</span>
        <span>·</span>
        <span>{levelLabels[level] || level}</span>
      </div>
      <h3 className="mt-4 text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>{title}</h3>
      <p className="mt-3 text-sm text-gray-600">{description}</p>
      <dl className="mt-5 grid gap-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <dt className="text-gray-500">Trajanje</dt>
          <dd>{duration}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Format</dt>
          <dd className="uppercase">{formatLabels[format] || format}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <a
          href={downloadUrl}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-5 py-2 text-sm font-semibold text-white transition focus:ring-2 focus:ring-gray-400 hover:opacity-90"
        >
          Podijeli / Preuzmi
        </a>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full rounded-3xl border border-dashed border-gray-300 bg-white/60 backdrop-blur-sm p-8 text-center text-sm text-gray-500">
      Nema planova koji odgovaraju ovim filterima. Dodaj novi PDF, Google Sheet ili video link ovdje.
    </div>
  );
}
