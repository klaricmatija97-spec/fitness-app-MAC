"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

const backgroundImages = [
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80",
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Učitavanje...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempPassword = searchParams.get("tempPassword");
  const clientId = searchParams.get("clientId");
  const preview = searchParams.get("preview") === "true";
  const usernameParam = searchParams.get("username");
  
  const [currentBgImage] = useState(0);
  const [username, setUsername] = useState(usernameParam || "test");
  const [tempPasswordInput, setTempPasswordInput] = useState(tempPassword || "test123");
  const [isTempPasswordVerified, setIsTempPasswordVerified] = useState(!!tempPassword || preview);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  
  // Ako je preview mod i ima tempPassword, automatski preskoči provjeru
  useEffect(() => {
    if (preview && tempPassword) {
      localStorage.setItem("authToken", "test-token");
      localStorage.setItem("clientId", clientId || "00000000-0000-0000-0000-000000000000");
    }
  }, [preview, tempPassword, clientId]);

  // Provjeri jednokratnu lozinku
  const handleTempPasswordCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Ako je preview mod, preskoči API poziv
    if (preview) {
      setIsTempPasswordVerified(true);
      localStorage.setItem("authToken", "test-token");
      localStorage.setItem("clientId", clientId || "00000000-0000-0000-0000-000000000000");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: tempPasswordInput, clientId }),
      });

      const data = await response.json();

      if (data.ok) {
        // Jednokratna lozinka je ispravna, prikaži formu za novu lozinku
        setIsTempPasswordVerified(true);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("clientId", data.clientId || "00000000-0000-0000-0000-000000000000");
      } else {
        setError(data.message || "Pogrešno korisničko ime ili jednokratna lozinka");
      }
    } catch (error) {
      setError("Greška pri provjeri. Molimo pokušajte ponovno.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Lozinke se ne podudaraju");
      return;
    }

    if (newPassword.length < 6) {
      setError("Lozinka mora imati najmanje 6 znakova");
      return;
    }

    // Ako je preview mod, preskoči API poziv i idi na app
    if (preview) {
      alert("Pregled mod: Lozinka je 'postavljena'! Preusmjeravam na aplikaciju...");
      router.push("/app?preview=true");
      return;
    }

    const storedClientId = localStorage.getItem("clientId");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          clientId: storedClientId || clientId, 
          tempPassword: tempPasswordInput, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (data.ok) {
        alert("Lozinka je uspješno postavljena! Preusmjeravam na aplikaciju...");
        router.push("/app");
      } else {
        setError(data.message || "Greška pri postavljanju lozinke");
      }
    } catch (error) {
      setError("Greška pri postavljanju lozinke. Molimo pokušajte ponovno.");
    }
  };

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 transition-opacity duration-2000 ease-in-out opacity-50"
          style={{
            backgroundImage: `url(${backgroundImages[currentBgImage]})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-slate-50/50" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-800 md:text-5xl mb-4" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
              CORP<span className="text-purple-400">EX</span>
            </h1>
            <h2 className="text-2xl font-semibold text-slate-800" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
              {isTempPasswordVerified ? "Postavi novu lozinku" : "Prijava s jednokratnom lozinkom"}
            </h2>
            {preview && (
              <div className="mt-4 rounded-2xl border border-blue-500 bg-blue-50 px-4 py-2 text-sm text-blue-800">
                📋 PREGLED MOD: Koristim test podatke - nema stvarne provjere
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-300 bg-slate-100/80 backdrop-blur-sm p-8 shadow-xl">
            {!preview && (
              <div className="mb-4 text-center">
                <button
                  onClick={() => {
                    // Preskoči login i idi direktno na app
                    localStorage.setItem("authToken", "test-token");
                    localStorage.setItem("clientId", "00000000-0000-0000-0000-000000000000");
                    router.push("/app?preview=true");
                  }}
                  className="text-sm text-slate-600 hover:text-slate-800 underline"
                  type="button"
                >
                  Preskoči login i pregledaj aplikaciju →
                </button>
              </div>
            )}
            {preview && (
              <div className="mb-4 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-center">
                <p className="text-xs text-slate-600 mb-2">
                  U pregled modu, privremena lozinka je automatski prihvaćena.
                </p>
                <p className="text-sm font-semibold text-slate-800 mb-1">Test podaci:</p>
                <p className="text-xs text-slate-600">Korisničko ime: <strong>testuser</strong></p>
                <p className="text-xs text-slate-600">Privremena lozinka: <strong>test123</strong></p>
              </div>
            )}
            {isTempPasswordVerified ? (
              <div className="space-y-6">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nova lozinka
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-slate-600 focus:outline-none"
                      required
                      placeholder="Unesi novu lozinku"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Potvrdi novu lozinku
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-slate-600 focus:outline-none"
                      required
                      placeholder="Potvrdi novu lozinku"
                    />
                  </div>
                  {error && (
                    <div className="rounded-2xl border border-red-600/50 bg-red-100 px-4 py-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setIsTempPasswordVerified(false);
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                      type="button"
                    >
                      Natrag
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-slate-600 to-slate-500 px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Postavi lozinku
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <form onSubmit={handleTempPasswordCheck} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Korisničko ime
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-slate-600 focus:outline-none"
                      required
                      placeholder="Unesi korisničko ime"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Jednokratna lozinka
                    </label>
                    <input
                      type="password"
                      value={tempPasswordInput}
                      onChange={(e) => setTempPasswordInput(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-slate-600 focus:outline-none"
                      required
                      placeholder="Unesi jednokratnu lozinku (iz emaila)"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Jednokratna lozinka je poslana na tvoj email
                    </p>
                  </div>
                  {error && (
                    <div className="rounded-2xl border border-red-600/50 bg-red-100 px-4 py-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      router.push("/payment?preview=true");
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                    type="button"
                  >
                    Natrag
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Provjeri jednokratnu lozinku
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

