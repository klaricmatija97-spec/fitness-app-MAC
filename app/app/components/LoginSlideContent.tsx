"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface LoginSlideContentProps {
  onNext: (slide: number) => void;
  nextSlideIndex: number;
  onBack?: () => void;
}

// Fitness/sportske slike - 4K kvaliteta (Unsplash/Pexels)
const backgroundImages = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=3840&q=90&auto=format&fit=crop", // gym equipment - 4K
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=3840&q=90&auto=format&fit=crop", // workout - 4K
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=3840&q=90&auto=format&fit=crop", // fitness - 4K
  "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=3840&q=90&auto=format&fit=crop", // training - 4K
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=3840&q=90&auto=format&fit=crop", // strength training - 4K
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=3840&q=90&auto=format&fit=crop", // gym - 4K
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
        // Očisti URL parametre
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
    }, 7000);
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
        // Spremi username u localStorage ako postoji u response-u
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
    
    // Osnovna provjera
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      return false;
    }
    
    const parts = trimmed.split("@");
    if (parts.length !== 2) {
      return false;
    }
    
    const [localPart, domain] = parts;
    
    // Provjeri lokalni dio (prije @)
    if (localPart.length === 0 || localPart.length > 64) {
      return false;
    }
    if (localPart.startsWith(".") || localPart.endsWith(".")) {
      return false;
    }
    if (localPart.includes("..")) {
      return false;
    }
    
    // Provjeri domenu (nakon @)
    if (domain.length === 0 || domain.length > 255) {
      return false;
    }
    if (!domain.includes(".")) {
      return false;
    }
    if (domain.startsWith(".") || domain.endsWith(".")) {
      return false;
    }
    if (domain.startsWith("-") || domain.endsWith("-")) {
      return false;
    }
    
    // Provjeri da domena ima barem jednu točku i barem 2 znaka nakon zadnje točke
    const domainParts = domain.split(".");
    if (domainParts.length < 2) {
      return false;
    }
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
      return false;
    }
    
    // Provjeri regex
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

    // Validacija emaila
    if (!isValidEmail(registerEmail)) {
      setRegisterError("Neispravan email format. Email mora biti u formatu: ime@domena.com");
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
      console.log("[Register Frontend] Sending registration request...");
      console.log("[Register Frontend] Data:", {
        name: registerName,
        username: registerUsername,
        email: registerEmail,
        phone: registerPhone.substring(0, 3) + "***",
      });
      
      const requestBody = {
        name: registerName,
        username: registerUsername,
        email: registerEmail,
        phone: registerPhone,
        password: registerPassword,
      };
      
      console.log("[Register Frontend] Request body (without password):", {
        ...requestBody,
        password: "***",
      });
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      console.log("[Register Frontend] Response status:", response.status);
      console.log("[Register Frontend] Response ok:", response.ok);
      console.log("[Register Frontend] Response headers:", Object.fromEntries(response.headers.entries()));

      // Provjeri da li response ima body - parsiraj čak i ako je status 500
      const text = await response.text();
      console.log("[Register Frontend] Response text length:", text?.length || 0);
      console.log("[Register Frontend] Response text preview:", text?.substring(0, 200) || "(empty)");
      
      if (!text || text.trim().length === 0) {
        console.error("[Register Frontend] Empty response body");
        // Ako nema body-a i status je 500, prikaži generičku poruku
        if (!response.ok && response.status >= 500) {
          setRegisterError("Greška na serveru. Molimo pokušaj ponovno kasnije.");
        } else {
          setRegisterError("Server nije vratio odgovor. Molimo pokušaj ponovno.");
        }
        setRegisterLoading(false);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
        console.log("[Register Frontend] Parsed response data:", {
          ok: data.ok,
          message: data.message,
          field: data.field,
          hasAllErrors: !!data.allErrors,
        });
      } catch (parseError) {
        console.error("[Register] JSON parse error:", parseError);
        console.error("[Register] Response text:", text);
        // Ako ne može parsirati JSON i status je 500, prikaži generičku poruku
        if (!response.ok && response.status >= 500) {
          setRegisterError("Greška na serveru. Molimo pokušaj ponovno kasnije.");
        } else {
          setRegisterError("Greška pri obradi odgovora servera. Molimo pokušaj ponovno.");
        }
        setRegisterLoading(false);
        return;
      }
      
      // Ako je status 500 ali imamo parsirani JSON s porukom, koristi tu poruku
      if (!response.ok && response.status >= 500) {
        const errorMsg = data?.message || "Greška na serveru. Molimo pokušaj ponovno kasnije.";
        console.error("[Register Frontend] Server error (500+):", errorMsg);
        setRegisterError(errorMsg);
        setRegisterLoading(false);
        return;
      }

      if (data.ok) {
        // Nakon uspješne registracije, preusmjeri na login s username-om
        // Spremi token i clientId privremeno
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("clientId", data.clientId);
        localStorage.setItem("registeredUsername", data.username || registerUsername);
        
        // Preusmjeri na login stranicu s username-om u URL parametrima
        // Reload stranice da se učita login slide s username-om
        window.location.href = `/app?username=${encodeURIComponent(data.username || registerUsername)}&fromRegister=true`;
      } else {
        // Prikaži detaljniju grešku ako postoji
        let errorMessage = data.message || "Greška pri registraciji";
        
        // Ako postoji field-specific greška, prikaži je
        if (data.field && data.allErrors && data.allErrors.length > 0) {
          const fieldError = data.allErrors.find((e: any) => e.field === data.field);
          if (fieldError) {
            errorMessage = fieldError.message;
          }
        }
        
        // Ako postoji više grešaka, prikaži sve
        if (data.allErrors && data.allErrors.length > 1) {
          const allErrorMessages = data.allErrors.map((e: any) => {
            const fieldName = e.fieldName || e.field;
            return `${fieldName}: ${e.message}`;
          }).join(" | ");
          errorMessage = allErrorMessages;
        }
        
        // Ako postoji details, dodaj ih u console za debugging
        if (data.details) {
          console.error("[Register] Error details:", data.details);
        }
        
        // Loguj grešku za debugging - provjeri da li data postoji i ima svojstva
        const errorDetails: any = {
          message: errorMessage,
        };
        
        if (data && typeof data === 'object') {
          if (data.field) errorDetails.field = data.field;
          if (data.code) errorDetails.code = data.code;
          if (data.allErrors) errorDetails.allErrors = data.allErrors;
          if (data.details) errorDetails.details = data.details;
          errorDetails.fullResponse = data;
        } else {
          errorDetails.rawData = data;
        }
        
        console.error("[Register] Registration error:", errorDetails);
        
        // Ako je greška prazan objekt ili nema poruke, koristi default poruku
        if (!errorMessage || errorMessage.trim() === "" || errorMessage === "Greška pri registraciji") {
          errorMessage = "Greška pri registraciji. Molimo provjeri sve podatke i pokušaj ponovno.";
        }
        
        setRegisterError(errorMessage);
      }
    } catch (error) {
      console.error("[Register] Network error:", error);
      console.error("[Register] Error details:", error instanceof Error ? error.message : String(error));
      
      // Provjeri da li je network error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setRegisterError("Nema konekcije s serverom. Provjeri internet konekciju i pokušaj ponovno.");
      } else {
      setRegisterError("Greška pri registraciji. Molimo pokušajte ponovno.");
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
      {/* Tamnije pozadinske slike - preko cijelog ekrana */}
      {backgroundImages.map((image, index) => (
        <div
          key={index}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: index === currentBgImage ? 1 : 0,
            transition: "opacity 0.5s ease-in-out",
            zIndex: index === currentBgImage ? 0 : -1,
            filter: "brightness(0.35) contrast(1.2)",
          }}
        />
      ))}

      {/* Naziv aplikacije - Gore - Fade In */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-30"
      >
        <h1
          className="text-5xl font-bold text-white drop-shadow-2xl"
          style={{
            fontFamily: "var(--font-montserrat), sans-serif",
            textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 2px 15px rgba(0,0,0,0.7)",
          }}
        >
          CORP<span className="text-purple-400">EX</span>
        </h1>
      </motion.div>

      {/* Content - Potpuno centrirano vertikalno i horizontalno */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4">
        {/* Subtle dark overlay za bolji kontrast */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        
        <div className="relative w-full max-w-md space-y-3">
          {/* Form - Premium Fade Animations */}
          <motion.div
            key={isLoginMode ? "login" : "register"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className="w-full"
            style={{ willChange: "transform, opacity" }}
          >
            <AnimatePresence mode="wait">
              {isLoginMode ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                  onSubmit={handleLogin}
                  className="space-y-3"
                  style={{ willChange: "opacity" }}
                >
                  <div className="space-y-2.5">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <label className="mb-1 block text-sm font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)" }}>
                        Korisničko ime
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-[12px] border-[2px] border-white/60 bg-black/50 px-3 py-2 text-base text-white font-medium placeholder-white/80 backdrop-blur-lg transition-all focus:border-white focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl"
                        required
                        placeholder="Unesi korisničko ime"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <label className="mb-1 block text-sm font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)" }}>
                        Lozinka
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-[12px] border-[2px] border-white/60 bg-black/50 px-3 py-2 text-base text-white font-medium placeholder-white/80 backdrop-blur-lg transition-all focus:border-white focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl"
                        required
                        placeholder="Unesi lozinku"
                      />
                    </motion.div>
                    {loginError && (
                      <div className="rounded-[12px] border-2 border-red-500/50 bg-red-500/20 px-3 py-2 text-xs text-red-200 backdrop-blur-sm">
                        {loginError}
                      </div>
                    )}
                  </div>
                  
                  {/* Toggle - Prijavi se / Registriraj se - Sitnije ispod, tamnije boje */}
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      type={isLoginMode ? "submit" : "button"}
                      onClick={isLoginMode ? undefined : () => {
                        setIsLoginMode(true);
                        setLoginError("");
                        setRegisterError("");
                      }}
                      disabled={isLoginMode && loginLoading}
                      className={`px-6 py-2.5 rounded-[12px] text-sm font-semibold transition-all duration-300 shadow-lg ${
                        isLoginMode
                          ? "bg-[#1A1A1A] text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          : "bg-black/40 text-white border border-white/30 hover:bg-black/60 hover:border-white/50 backdrop-blur-sm"
                      }`}
                    >
                      {isLoginMode && loginLoading ? "Prijavljuje se..." : "Prijavi se"}
                    </button>
                    <button
                      type={!isLoginMode ? "submit" : "button"}
                      onClick={!isLoginMode ? undefined : () => {
                        setIsLoginMode(false);
                        setLoginError("");
                        setRegisterError("");
                      }}
                      disabled={!isLoginMode && registerLoading}
                      className={`px-6 py-2.5 rounded-[12px] text-sm font-semibold transition-all duration-300 shadow-lg ${
                        !isLoginMode
                          ? "bg-[#1A1A1A] text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          : "bg-black/40 text-white border border-white/30 hover:bg-black/60 hover:border-white/50 backdrop-blur-sm"
                      }`}
                    >
                      {!isLoginMode && registerLoading ? "Registrira se..." : "Registriraj se"}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleRegister}
                  className="w-full space-y-2.5"
                >
                  <div className="space-y-2">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <label className="mb-1 block text-sm font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)" }}>
                        Ime i prezime
                      </label>
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="w-full rounded-[12px] border-[2px] border-white/60 bg-black/50 px-3 py-2 text-base text-white font-medium placeholder-white/80 backdrop-blur-lg transition-all focus:border-white focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl"
                        required
                        placeholder="Unesi ime i prezime"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <label className="mb-1 block text-sm font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)" }}>
                        Korisničko ime
                      </label>
                      <input
                        type="text"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        className="w-full rounded-[12px] border-[2px] border-white/60 bg-black/50 px-3 py-2 text-base text-white font-medium placeholder-white/80 backdrop-blur-lg transition-all focus:border-white focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl"
                        required
                        placeholder="Unesi korisničko ime"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <label className="mb-1 block text-sm font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)" }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => {
                          setRegisterEmail(e.target.value);
                          // Očisti grešku kada korisnik počne tipkati
                          if (registerError && registerError.includes("email")) {
                            setRegisterError("");
                          }
                        }}
                        onBlur={(e) => {
                          // Provjeri email kada korisnik napusti polje
                          if (e.target.value && !isValidEmail(e.target.value)) {
                            setRegisterError("Neispravan email format. Email mora biti u formatu: ime@domena.com");
                          }
                        }}
                        className="w-full rounded-[12px] border-[2px] border-white/60 bg-black/50 px-3 py-2 text-base text-white font-medium placeholder-white/80 backdrop-blur-lg transition-all focus:border-white focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl"
                        required
                        placeholder="npr. ime@domena.com"
                      />
                      {registerEmail && !isValidEmail(registerEmail) && (
                        <p className="mt-1 text-xs text-red-300">
                          Neispravan email format
                        </p>
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <label className="mb-1 block text-sm font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)" }}>
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        className="w-full rounded-[12px] border-[2px] border-white/60 bg-black/50 px-3 py-2 text-base text-white font-medium placeholder-white/80 backdrop-blur-lg transition-all focus:border-white focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl"
                        required
                        placeholder="Unesi telefon"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <label className="mb-1 block text-sm font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)" }}>
                        Lozinka
                      </label>
                      <input
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="w-full rounded-[12px] border-[2px] border-white/60 bg-black/50 px-3 py-2 text-base text-white font-medium placeholder-white/80 backdrop-blur-lg transition-all focus:border-white focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl"
                        required
                        placeholder="Unesi lozinku"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      <label className="mb-1 block text-sm font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)" }}>
                        Potvrdi lozinku
                      </label>
                      <input
                        type="password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        className="w-full rounded-[12px] border-[2px] border-white/60 bg-black/50 px-3 py-2 text-base text-white font-medium placeholder-white/80 backdrop-blur-lg transition-all focus:border-white focus:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-xl"
                        required
                        placeholder="Potvrdi lozinku"
                      />
                    </motion.div>
                    <AnimatePresence>
                    {registerError && (
                        <motion.div
                          initial={{ opacity: 0, y: -5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                          className="rounded-[12px] border-2 border-red-500/50 bg-red-500/20 px-3 py-2 text-xs text-red-200 backdrop-blur-sm"
                        >
                        {registerError}
                        </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Toggle - Prijavi se / Registriraj se - Sitnije ispod, tamnije boje */}
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      type={isLoginMode ? "submit" : "button"}
                      onClick={isLoginMode ? undefined : () => {
                        setIsLoginMode(true);
                        setLoginError("");
                        setRegisterError("");
                      }}
                      disabled={isLoginMode && loginLoading}
                      className={`px-6 py-2.5 rounded-[12px] text-sm font-semibold transition-all duration-300 shadow-lg ${
                        isLoginMode
                          ? "bg-[#1A1A1A] text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          : "bg-black/40 text-white border border-white/30 hover:bg-black/60 hover:border-white/50 backdrop-blur-sm"
                      }`}
                    >
                      {isLoginMode && loginLoading ? "Prijavljuje se..." : "Prijavi se"}
                    </button>
                    <button
                      type={!isLoginMode ? "submit" : "button"}
                      onClick={!isLoginMode ? undefined : () => {
                        setIsLoginMode(false);
                        setLoginError("");
                        setRegisterError("");
                      }}
                      disabled={!isLoginMode && registerLoading}
                      className={`px-6 py-2.5 rounded-[12px] text-sm font-semibold transition-all duration-300 shadow-lg ${
                        !isLoginMode
                          ? "bg-[#1A1A1A] text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          : "bg-black/40 text-white border border-white/30 hover:bg-black/60 hover:border-white/50 backdrop-blur-sm"
                      }`}
                    >
                      {!isLoginMode && registerLoading ? "Registrira se..." : "Registriraj se"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Navigation Arrow - Left side (nazad na login) */}
      {!isLoginMode && (
        <motion.div
          className="absolute left-8 top-1/2 -translate-y-1/2 z-30 group"
          whileHover={{ scale: 1.2 }}
          transition={{ duration: 0.2 }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsLoginMode(true);
              setRegisterError("");
              setLoginError("");
            }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/30 hover:border-white/50 hover:shadow-2xl"
            aria-label="Back to login"
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </motion.div>
      )}

      {/* Navigation Arrow - Right side (dalje) */}
      <motion.div
        className="absolute right-8 top-1/2 -translate-y-1/2 z-30 group"
        whileHover={{ scale: 1.2 }}
        transition={{ duration: 0.2 }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            if (isLoginMode && username && password) {
              handleLogin(e as any);
            } else if (!isLoginMode && registerName && registerEmail && registerPhone && registerPassword) {
              handleRegister(e as any);
            }
          }}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/30 hover:border-white/50 hover:shadow-2xl"
          aria-label="Next slide"
        >
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}
