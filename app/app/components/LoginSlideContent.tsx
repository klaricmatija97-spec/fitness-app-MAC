"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface LoginSlideContentProps {
  onNext: (slide: number) => void;
  nextSlideIndex: number;
  onBack?: () => void;
}

// Premium sportske slike - Olympic lifting stil
const backgroundImages = [
  "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&h=1080&fit=crop&q=80",
  "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&h=1080&fit=crop&q=80",
  "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&h=1080&fit=crop&q=80",
];

export default function LoginSlideContent({ onNext, nextSlideIndex, onBack }: LoginSlideContentProps) {
  const router = useRouter();
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Provjeri URL parametre za username (nakon registracije)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const usernameParam = urlParams.get("username");
      const fromRegister = urlParams.get("fromRegister");
      
      if (usernameParam && fromRegister === "true") {
        setUsername(usernameParam);
        window.history.replaceState({}, "", "/app");
      }
    }
  }, []);
  
  // Register state
  const [registerName, setRegisterName] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // Rotiraj pozadinske slike
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgImage((prev) => (prev + 1) % backgroundImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Provjeri URL parametre
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tempPassword = params.get("tempPassword");
    const clientId = params.get("clientId");
    const preview = params.get("preview") === "true";
    const usernameParam = params.get("username");

    if (preview && tempPassword) {
      localStorage.setItem("authToken", "test-token");
      localStorage.setItem("clientId", clientId || "00000000-0000-0000-0000-000000000000");
      if (usernameParam) setUsername(usernameParam);
      if (tempPassword) setPassword(tempPassword);
    }
  }, []);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.ok) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("clientId", data.clientId);
        if (data.username) {
          localStorage.setItem("username", data.username);
        }
        onNext(nextSlideIndex);
      } else {
        setLoginError(data.message || "Pogrešno korisničko ime ili lozinka");
      }
    } catch (error) {
      setLoginError("Greška pri prijavi. Molimo pokušajte ponovno.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Funkcija za validaciju emaila
  const isValidEmail = (email: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) return false;
    const parts = trimmed.split("@");
    if (parts.length !== 2) return false;
    const [localPart, domain] = parts;
    if (localPart.length === 0 || localPart.length > 64) return false;
    if (domain.length === 0 || domain.length > 255) return false;
    if (!domain.includes(".")) return false;
    const domainParts = domain.split(".");
    if (domainParts.length < 2) return false;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) return false;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(trimmed);
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    
    if (!registerName || !registerUsername || !registerEmail || !registerPhone || !registerPassword) {
      setRegisterError("Molimo ispunite sva polja");
      return;
    }

    if (!isValidEmail(registerEmail)) {
      setRegisterError("Neispravan email format");
      return;
    }

    if (registerUsername.length < 3) {
      setRegisterError("Korisničko ime mora imati najmanje 3 znaka");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError("Lozinke se ne podudaraju");
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError("Lozinka mora imati najmanje 6 znakova");
      return;
    }

    setRegisterLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          username: registerUsername,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
        }),
      });

      const text = await response.text();
      if (!text || text.trim().length === 0) {
        setRegisterError("Server nije vratio odgovor. Molimo pokušaj ponovno.");
        setRegisterLoading(false);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        setRegisterError("Greška pri obradi odgovora servera.");
        setRegisterLoading(false);
        return;
      }

      if (data.ok) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("clientId", data.clientId);
        localStorage.setItem("registeredUsername", data.username || registerUsername);
        window.location.href = `/app?username=${encodeURIComponent(data.username || registerUsername)}&fromRegister=true`;
      } else {
        setRegisterError(data.message || "Greška pri registraciji");
      }
    } catch (error) {
      setRegisterError("Greška pri registraciji. Molimo pokušajte ponovno.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
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
          {isLoginMode ? (
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
                className="text-white/60 text-center text-sm mb-10"
              >
                Unesi podatke za pristup
              </motion.p>

              <form onSubmit={handleLogin} className="space-y-6">
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
                    Lozinka
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-3 text-white text-lg font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="••••••••"
                  />
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-400/80 text-sm text-center py-2"
                    >
                      {loginError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="pt-6 space-y-4"
                >
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-4 border border-white/30 text-white text-sm tracking-wider uppercase font-light transition-all duration-300 hover:bg-white/10 hover:border-white/50 disabled:opacity-50"
                  >
                    {loginLoading ? "Prijavljujem..." : "Prijavi se"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginMode(false);
                      setLoginError("");
                    }}
                    className="w-full py-3 text-white/50 text-xs tracking-wider hover:text-white/70 transition-colors"
                  >
                    Nemaš račun? Registriraj se →
                  </button>
                </motion.div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="register-form"
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
                Registracija
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-white/60 text-center text-sm mb-8"
              >
                Kreiraj svoj račun
              </motion.p>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Name */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Ime i prezime
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-2.5 text-white text-base font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="Ivan Horvat"
                  />
                </motion.div>

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
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-2.5 text-white text-base font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="ivan.horvat"
                  />
                </motion.div>

                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-2.5 text-white text-base font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="ivan@email.com"
                  />
                </motion.div>

                {/* Phone */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-2.5 text-white text-base font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="+385 91 234 5678"
                  />
                </motion.div>

                {/* Password */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.45 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Lozinka
                  </label>
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-2.5 text-white text-base font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="••••••••"
                  />
                </motion.div>

                {/* Confirm Password */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  <label className="block text-white/60 text-xs tracking-wider mb-2 uppercase">
                    Potvrdi lozinku
                  </label>
                  <input
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 py-2.5 text-white text-base font-light focus:outline-none focus:border-white/70 transition-colors placeholder:text-white/30"
                    required
                    placeholder="••••••••"
                  />
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {registerError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-red-400/80 text-sm text-center py-2"
                    >
                      {registerError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.55 }}
                  className="pt-4 space-y-4"
                >
                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full py-4 border border-white/30 text-white text-sm tracking-wider uppercase font-light transition-all duration-300 hover:bg-white/10 hover:border-white/50 disabled:opacity-50"
                  >
                    {registerLoading ? "Registriram..." : "Registriraj se"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginMode(true);
                      setRegisterError("");
                    }}
                    className="w-full py-3 text-white/50 text-xs tracking-wider hover:text-white/70 transition-colors"
                  >
                    ← Već imaš račun? Prijavi se
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
    </div>
  );
}
