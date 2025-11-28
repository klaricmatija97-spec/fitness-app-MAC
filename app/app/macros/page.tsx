"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MacrosPage() {
  const router = useRouter();
  const [calculations, setCalculations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    
    // Za pregled, omogući pristup bez clientId
    // if (!clientId) {
    //   router.push("/login");
    //   return;
    // }

    // Dohvati izračune
    fetch(`/api/calculations/${clientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setCalculations(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

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
        <p className="text-gray-600 mb-4">
          Prvo izračunaj svoje kalorije na stranici Kalkulator Kalorija.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
        Makrosi
      </h1>

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
        <p className="text-gray-600 mb-4">
          Makrosi su prilagođeni tvojim ciljevima i informacijama iz prve faze. 
          Ovi makrosi će ti pomoći da postigneš svoj cilj.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Tvoji Dnevni Makrosi</h2>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="text-sm text-gray-500 mb-2">Proteini</div>
            <div className="text-4xl font-bold text-gray-900 mb-1">{calculations.protein_grams}</div>
            <div className="text-sm text-gray-600">grama</div>
            <div className="text-xs text-gray-500 mt-2">
              {Math.round((calculations.protein_grams * 4 / calculations.target_calories) * 100)}% kalorija
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="text-sm text-gray-500 mb-2">Ugljikohidrati</div>
            <div className="text-4xl font-bold text-gray-900 mb-1">{calculations.carbs_grams}</div>
            <div className="text-sm text-gray-600">grama</div>
            <div className="text-xs text-gray-500 mt-2">
              {Math.round((calculations.carbs_grams * 4 / calculations.target_calories) * 100)}% kalorija
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="text-sm text-gray-500 mb-2">Masti</div>
            <div className="text-4xl font-bold text-gray-900 mb-1">{calculations.fats_grams}</div>
            <div className="text-sm text-gray-600">grama</div>
            <div className="text-xs text-gray-500 mt-2">
              {Math.round((calculations.fats_grams * 9 / calculations.target_calories) * 100)}% kalorija
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <strong>Ukupno kalorija:</strong> {calculations.target_calories} kcal
          </div>
        </div>
      </div>
    </div>
  );
}

