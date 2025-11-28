"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateAll, type ClientData } from "@/lib/calculations";
import { saveUserCalculationsLocal } from "@/lib/utils/userCalculationsLocal";

export default function CalculatorPage() {
  const router = useRouter();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [calculations, setCalculations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    
    // Za pregled, omogući pristup bez clientId
    // if (!clientId) {
    //   router.push("/login");
    //   return;
    // }

    // Dohvati podatke klijenta (ako postoji)
    if (clientId) {
      fetch(`/api/client/${clientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          // Konvertuj podatke u format za kalkulator
          const age = parseInt(data.age_range?.split("-")[0]) || 30;
          const weight = data.weight_unit === "lb" 
            ? data.weight_value * 0.453592 
            : data.weight_value || 70;
          const height = data.height_unit === "in"
            ? data.height_value * 2.54
            : data.height_value || 175;
          
          const gender = data.honorific === "mr" ? "male" : "female";
          
          const clientDataForCalc: ClientData = {
            age,
            gender,
            weight,
            height,
            activityLevel: "moderate",
            activities: data.activities || [],
            goals: data.goals || [],
          };

          setClientData(clientDataForCalc);
        }
        setLoading(false);
      })
      .catch(() => {
        // Za pregled, postavi default podatke
        const defaultData: ClientData = {
          age: 30,
          gender: "male",
          weight: 70,
          height: 175,
          activityLevel: "moderate",
          activities: [],
          goals: [],
        };
        setClientData(defaultData);
        setLoading(false);
      });
    } else {
      // Za pregled bez login-a, postavi default podatke
      const defaultData: ClientData = {
        age: 30,
        gender: "male",
        weight: 70,
        height: 175,
        activityLevel: "moderate",
        activities: [],
        goals: [],
      };
      setClientData(defaultData);
      setLoading(false);
    }
  }, [router]);

  const handleCalculate = async () => {
    if (!clientData) {
      alert("Nema podataka za izračun. Molimo osvježite stranicu.");
      return;
    }

    setIsCalculating(true);
    try {
      // Izračunaj kalkulacije
      const calc = calculateAll(clientData);
      setCalculations(calc);
    } catch (error) {
      console.error("Error calculating:", error);
      alert("Greška pri izračunu. Molimo pokušajte ponovo.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      alert("Niste prijavljeni. Molimo se prijavite prvo.");
      return;
    }

    if (!calculations) {
      alert("Prvo izračunajte kalorije i makroe prije spremanja.");
      return;
    }

    setIsSaving(true);
    try {
      const calcData = {
        totalCalories: calculations.targetCalories,
        proteinGrams: calculations.macros.protein,
        carbGrams: calculations.macros.carbs,
        fatGrams: calculations.macros.fats,
        bmr: calculations.bmr,
        tdee: calculations.tdee,
        goalType: calculations.goalType,
        activityLevel: calculations.activityLevel,
      };

      console.log("📥 Spremam kalkulacije", calcData);
      
      // Spremi kalkulacije u localStorage i Supabase
      await saveUserCalculationsLocal(calcData);
      
      console.log("✅ Spremljeno u localStorage i Supabase");

      alert("Kalkulacije su uspješno spremljene!");
      
      // Redirect na /app/meals nakon uspješnog spremanja
      router.push("/app/meals");
    } catch (error) {
      console.error("Error saving calculations:", error);
      alert(error instanceof Error ? error.message : "Greška pri spremanju. Molimo pokušajte ponovo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-gray-600">Učitavanje...</p>
      </div>
    );
  }

  if (!calculations) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-gray-600">Nema podataka za izračun</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
        Kalkulator Kalorija
      </h1>

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
        <p className="text-gray-600 mb-4">
          Ovaj kalkulator služi za izračun tvojih dnevnih potreba za kalorijama. 
          Ako želiš gubiti kilažu (preporučeno 0.5kg tjedno), potrebno je 500 kalorija manje od preporučenog iznosa. 
          Ako želiš dobiti kilažu, potrebno je 500 kalorija više.
        </p>
      </div>

      <div className="space-y-6">
        {!calculations ? (
          <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
            <p className="text-gray-600 mb-4 text-center">
              Klikni na gumb "Izračunaj kalorije" da izračunamo tvoje dnevne potrebe za kalorijama i makronutrijentima.
            </p>
            <button
              onClick={handleCalculate}
              disabled={isCalculating || !clientData}
              className="w-full rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? "Izračunavam..." : "✓ Izračunaj kalorije"}
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Tvoji Izračuni</h2>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-sm text-gray-500 mb-1">BMR (Bazalni metabolizam)</div>
                  <div className="text-3xl font-bold text-gray-900">{calculations.bmr}</div>
                  <div className="text-sm text-gray-600">kalorija/dan</div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-sm text-gray-500 mb-1">TDEE (Ukupna potrošnja)</div>
                  <div className="text-3xl font-bold text-gray-900">{calculations.tdee}</div>
                  <div className="text-sm text-gray-600">kalorija/dan</div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                  <div className="text-sm text-gray-500 mb-1">Cilj Kalorije</div>
                  <div className="text-3xl font-bold text-gray-900">{calculations.targetCalories}</div>
                  <div className="text-sm text-gray-600">
                    kalorija/dan ({calculations.goalType === "lose" ? "Gubitak" : calculations.goalType === "gain" ? "Dobivanje" : "Održavanje"})
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-sm text-gray-500 mb-1">Proteini</div>
                  <div className="text-3xl font-bold text-gray-900">{calculations.macros.protein}g</div>
                  <div className="text-sm text-gray-600">dnevno</div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-sm text-gray-500 mb-1">Ugljikohidrati</div>
                  <div className="text-3xl font-bold text-gray-900">{calculations.macros.carbs}g</div>
                  <div className="text-sm text-gray-600">dnevno</div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                  <div className="text-sm text-gray-500 mb-1">Masti</div>
                  <div className="text-3xl font-bold text-gray-900">{calculations.macros.fats}g</div>
                  <div className="text-sm text-gray-600">dnevno</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCalculate}
                disabled={isCalculating || !clientData}
                className="flex-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculating ? "Izračunavam..." : "🔄 Ponovno izračunaj"}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !calculations}
                className="flex-1 rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Spremam..." : "💾 Spremi i nastavi"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

