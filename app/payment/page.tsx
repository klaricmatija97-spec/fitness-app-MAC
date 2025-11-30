"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

// Besplatne sportske slike bez autorskih prava (Unsplash)
const backgroundImages = [
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80",
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80",
];

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Učitavanje...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const preview = searchParams.get("preview") === "true";
  
  const [currentBgImage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank" | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handlePayment = async () => {
    // Ako je preview mod, preskoči plaćanje
    if (preview || !clientId) {
      // Za pregled - preusmjeri na login s test podacima
      router.push("/login?preview=true&clientId=00000000-0000-0000-0000-000000000000&tempPassword=test123&username=testuser");
      return;
    }
    
    // Ovdje ćeš dodati stvarnu payment integraciju
    // Za sada simulirajmo uspješno plaćanje

    try {
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, paymentMethod }),
      });

      const data = await response.json();
      
      if (data.ok) {
        // Preusmjeri na login stranicu s temp passwordom
        router.push(`/login?clientId=${clientId}&tempPassword=${data.tempPassword}`);
      } else {
        alert("Greška pri plaćanju: " + data.message);
      }
    } catch (error) {
      alert("Greška pri plaćanju. Molimo pokušajte ponovno.");
    }
  };

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Rotirajuće sportske slike u pozadini */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 transition-opacity duration-2000 ease-in-out opacity-50"
          style={{
            backgroundImage: `url(${backgroundImages[currentBgImage]})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="absolute inset-0 bg-slate-50/50" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800 md:text-5xl mb-4" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
            CORP<span className="text-purple-400">EX</span>
          </h1>
          <h2 className="text-3xl font-semibold text-slate-800 md:text-4xl mb-4" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
            Premium Plan
          </h2>
          {preview && (
            <div className="mb-4 rounded-2xl border border-blue-500 bg-blue-50 px-4 py-2 text-sm text-blue-800">
              📋 PREGLED MOD: Ovo je test verzija - nema stvarnog plaćanja
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-300 bg-slate-100/80 backdrop-blur-sm p-8 shadow-xl">
          {preview && (
              <div className="mb-6 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-center">
                <p className="text-sm text-slate-700 mb-3">
                U pregled modu možeš proći kroz cijeli flow bez stvarnog plaćanja.
              </p>
              <button
                onClick={() => {
                  // Preusmjeri na login s test podacima
                  router.push("/login?preview=true&clientId=00000000-0000-0000-0000-000000000000&tempPassword=test123&username=testuser");
                }}
                className="inline-block rounded-full bg-gradient-to-r from-slate-600 to-slate-500 px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Preskoči plaćanje → Pregled Login-a
              </button>
            </div>
          )}
          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-slate-800 mb-4">Odaberi način plaćanja</h3>
            
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <button
                onClick={() => {
                  setPaymentMethod("card");
                  setShowPaymentForm(true);
                }}
                className={clsx(
                  "rounded-2xl border p-6 text-left transition",
                  paymentMethod === "card"
                    ? "border-slate-600 bg-slate-600 text-white"
                    : "border-slate-300 bg-slate-50/80 text-slate-800 hover:border-slate-400"
                )}
              >
                <div className="font-semibold mb-2">Kartica</div>
                <div className="text-sm opacity-80">Visa, Mastercard, Maestro</div>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod("bank");
                  setShowPaymentForm(true);
                }}
                className={clsx(
                  "rounded-2xl border p-6 text-left transition",
                  paymentMethod === "bank"
                    ? "border-slate-600 bg-slate-600 text-white"
                    : "border-slate-300 bg-slate-50/80 text-slate-800 hover:border-slate-400"
                )}
              >
                <div className="font-semibold mb-2">Bankovni transfer</div>
                <div className="text-sm opacity-80">IBAN će biti poslan nakon odabira</div>
              </button>
            </div>
          </div>

          {!showPaymentForm && (
            <div className="flex justify-start pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  router.push(preview ? "/app?preview=true" : "/app");
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                type="button"
              >
                Natrag
              </button>
            </div>
          )}

          {showPaymentForm && (
            <div className="border-t border-slate-200 pt-6">
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">
                  {paymentMethod === "bank" 
                    ? "Nakon što izvršiš bankovni transfer, kontaktiraj me na email ili WhatsApp s potvrdom plaćanja."
                    : "Unesi podatke kartice (ovdje ćeš integrirati Stripe ili drugi payment provider)"}
                </p>
              </div>

              {paymentMethod === "bank" && (
                <div className="bg-slate-100 rounded-2xl p-4 mb-4">
                  <p className="text-sm font-semibold text-slate-800 mb-2">IBAN za plaćanje:</p>
                  <p className="text-lg font-mono text-slate-700">HR12 3456 7890 1234 5678 9</p>
                  <p className="text-xs text-slate-500 mt-2">(Ovo ćeš zamijeniti sa svojim stvarnim IBAN-om)</p>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    router.push(preview ? "/app?preview=true" : "/app");
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  type="button"
                >
                  Natrag
                </button>
                <button
                  onClick={handlePayment}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-slate-600 to-slate-500 px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  {paymentMethod === "bank" ? "Potvrdi plaćanje" : "Plati"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

