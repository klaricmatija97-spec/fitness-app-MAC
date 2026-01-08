"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Premium sportske slike - Olympic lifting / F1 trening stil
const backgroundImages = [
  "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80", // Olympic lifting
  "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80", // Weightlifting
  "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80", // Athletic training
  "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80", // Gym training
];

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/60 text-lg font-light tracking-widest"
        >
          CORPEX
        </motion.div>
      </div>
    }>
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
  
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const [username, setUsername] = useState(usernameParam || "");
  const [tempPasswordInput, setTempPasswordInput] = useState(tempPassword || "");
  const [isTempPasswordVerified, setIsTempPasswordVerified] = useState(!!tempPassword || preview);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Rotiraj pozadinske slike
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgImage((prev) => (prev + 1) % backgroundImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  
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
    setIsLoading(true);

    // Ako je preview mod, preskoči API poziv
    if (preview) {
      setIsTempPasswordVerified(true);
      localStorage.setItem("authToken", "test-token");
      localStorage.setItem("clientId", clientId || "00000000-0000-0000-0000-000000000000");
      setIsLoading(false);
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
        setIsTempPasswordVerified(true);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("clientId", data.clientId || "00000000-0000-0000-0000-000000000000");
      } else {
        setError(data.message || "Pogrešno korisničko ime ili jednokratna lozinka");
      }
    } catch (error) {
      setError("Greška pri provjeri. Molimo pokušajte ponovno.");
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);

    // Ako je preview mod, preskoči API poziv i idi na app
    if (preview) {
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
        router.push("/app");
      } else {
        setError(data.message || "Greška pri postavljanju lozinke");
      }
    } catch (error) {
      setError("Greška pri postavljanju lozinke. Molimo pokušajte ponovno.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLogin = () => {
    localStorage.setItem("authToken", "test-token");
    localStorage.setItem("clientId", "00000000-0000-0000-0000-000000000000");
    // Postavi currentSlide na honorific (prvi screen upitnika, index 1)
    localStorage.setItem("appCurrentSlide", "1");
    router.push("/app?preview=true");
  };

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      {/* Rotirajuće pozadinske slike */}
      <AnimatePresence mode="sync">
        {backgroundImages.map((img, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: idx === currentBgImage ? 1 : 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${img})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "brightness(0.25) saturate(0.7)",
            }}
          />
        ))}
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      {/* Corpex logo */}
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-8 left-1/2 -translate-x-1/2 text-white/80 text-sm tracking-[0.4em] font-light z-20"
      >
        CORPEX
      </motion.p>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {!isTempPasswordVerified ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              className="w-full max-w-md"
            >
              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-3xl md:text-4xl font-light text-white text-center mb-3"
              >
                Prijava
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-white/60 text-center text-sm mb-12"
              >
                Unesi podatke za pristup
              </motion.p>

              <form onSubmit={handleTempPasswordCheck} className="space-y-6">
                {/* Username */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Korisničko ime
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-3 text-white text-lg font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="ime.prezime"
                  />
                </motion.div>

                {/* Password */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Jednokratna lozinka
                  </label>
                  <input
                    type="password"
                    value={tempPasswordInput}
                    onChange={(e) => setTempPasswordInput(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-3 text-white text-lg font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="••••••••"
                  />
                  <p className="mt-2 text-white/50 text-xs">
                    Jednokratna lozinka je poslana na tvoj email
                  </p>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-400/80 text-sm text-center py-2"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="pt-8"
                >
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 border border-white/30 text-white text-sm tracking-wider uppercase font-light transition-all duration-300 hover:bg-white/10 hover:border-white/50 disabled:opacity-50"
                  >
                    {isLoading ? "Provjeravam..." : "Nastavi"}
                  </button>
                </motion.div>
              </form>

              {/* Skip login */}
              {!preview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                  className="mt-8 text-center"
                >
                  <button
                    onClick={handleSkipLogin}
                    className="text-white/30 text-xs tracking-wider hover:text-white/50 transition-colors"
                  >
                    Preskoči prijavu →
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="password-form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              className="w-full max-w-md"
            >
              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-3xl md:text-4xl font-light text-white text-center mb-3"
              >
                Nova lozinka
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-white/60 text-center text-sm mb-12"
              >
                Postavi svoju trajnu lozinku
              </motion.p>

              <form onSubmit={handleChangePassword} className="space-y-6">
                {/* New Password */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Nova lozinka
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-3 text-white text-lg font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="••••••••"
                  />
                </motion.div>

                {/* Confirm Password */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Potvrdi lozinku
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-3 text-white text-lg font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="••••••••"
                  />
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-400/80 text-sm text-center py-2"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="pt-8 space-y-4"
                >
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 border border-white/30 text-white text-sm tracking-wider uppercase font-light transition-all duration-300 hover:bg-white/10 hover:border-white/50 disabled:opacity-50"
                  >
                    {isLoading ? "Postavljam..." : "Postavi lozinku"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setIsTempPasswordVerified(false)}
                    className="w-full py-3 text-white/40 text-xs tracking-wider hover:text-white/60 transition-colors"
                  >
                    ← Natrag
                  </button>
                </motion.div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom decoration line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
    </main>
  );
}
