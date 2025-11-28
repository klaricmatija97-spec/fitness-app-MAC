"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TrainingPage() {
  const router = useRouter();
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    
    // Za pregled, omogući pristup bez clientId
    // if (!clientId) {
    //   router.push("/login");
    //   return;
    // }

    // Dohvati plan treninga
    fetch(`/api/training/${clientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setTrainingPlan(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-gray-600">Učitavanje...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
        Trening Plan
      </h1>

      {!trainingPlan ? (
        <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
          <p className="text-gray-600 mb-4">
            Tvoj personalizirani plan treninga će biti generiran na osnovu tvojih ciljeva i aktivnosti.
          </p>
          <button
            onClick={async () => {
              const clientId = localStorage.getItem("clientId");
              if (!clientId) return;
              
              const res = await fetch("/api/training/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId }),
              });
              
              const data = await res.json();
              if (data.ok) {
                setTrainingPlan(data);
              }
            }}
            className="rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-3 text-base font-semibold text-white transition hover:opacity-90"
          >
            Generiraj Plan Treninga
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <TrainingSession plan={trainingPlan} />
          <RecoveryRecommendations />
        </div>
      )}
    </div>
  );
}

function TrainingSession({ plan }: { plan: any }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  const exercises = plan.exercises || [];

  const handleCompleteExercise = () => {
    setCompletedExercises(new Set([...completedExercises, currentExercise]));
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
    }
  };

  const handleCompleteWorkout = async () => {
    const clientId = localStorage.getItem("clientId");
    if (!clientId) return;

    await fetch("/api/workout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        trainingPlanId: plan.id,
        exercisesCompleted: Array.from(completedExercises),
      }),
    });

    alert("Trening je završen!");
  };

  if (exercises.length === 0) {
    return <p className="text-gray-600">Nema vježbi u planu</p>;
  }

  const exercise = exercises[currentExercise];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Zagrijavanje</h2>
        <p className="text-gray-600">
          Odaberi tip zagrijavanja: {plan.warmup_type === "treadmill" ? "Traka" : plan.warmup_type === "bike" ? "Biciklo" : "Vlastito tijelo"}
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Vježba {currentExercise + 1} / {exercises.length}
        </h2>
        
        <div className="rounded-2xl bg-gray-50 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">{exercise.name}</h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>Setovi:</strong> {exercise.sets}</p>
            <p><strong>Ponavljanja:</strong> {exercise.reps}</p>
            <p><strong>Odmor:</strong> {exercise.rest} sekundi</p>
            {exercise.alternative && (
              <p><strong>Alternativa:</strong> {exercise.alternative}</p>
            )}
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slika sprave (opcionalno)
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Poruka (opcionalno)
            </label>
            <textarea
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm"
              rows={3}
              placeholder="Pitaj bilo što o ovoj vježbi..."
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {currentExercise < exercises.length - 1 ? (
          <button
            onClick={handleCompleteExercise}
            className="flex-1 rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-3 text-base font-semibold text-white transition hover:opacity-90"
          >
            ✓ Završi Vježbu
          </button>
        ) : (
          <button
            onClick={handleCompleteWorkout}
            className="flex-1 rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-3 text-base font-semibold text-white transition hover:opacity-90"
          >
            ✓ Završi Trening
          </button>
        )}
      </div>
    </div>
  );
}

function RecoveryRecommendations() {
  return (
    <div className="mt-6 rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Preporuke za Oporavak</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Istezanje</h3>
          <p className="text-gray-600 text-sm">
            Nakon treninga snage, preporuča se statičko istezanje glavnih mišićnih skupina koje si koristio. 
            Drži svako istezanje 30-60 sekundi. Fokusiraj se na mišiće koje si trenirao.
          </p>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Sauna</h3>
          <p className="text-gray-600 text-sm mb-2">
            <strong>Kada je dobra:</strong> Sauna nakon treninga snage može pomoći u oporavku i povećanju mišićne mase 
            jer poboljšava cirkulaciju i opuštanje mišića. Preporuča se 10-15 minuta na 70-80°C.
          </p>
          <p className="text-gray-600 text-sm mb-2">
            <strong>Kada nije dobra:</strong> Izbjegavaj saunu ako si previše umoran, dehidriran, ili imaš 
            otvorene rane. Također, ne idi u saunu prije treninga jer može smanjiti performanse.
          </p>
          <p className="text-gray-600 text-sm">
            <strong>Kako se koristi:</strong> Nakon treninga, pričekaj 10-15 minuta da se tijelo ohladi. 
            Uđi u saunu na 10-15 minuta, izađi i ohladi se, ponovi 2-3 puta. Pij puno vode!
          </p>
        </div>
      </div>
    </div>
  );
}

