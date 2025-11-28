"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Preusmjeri root (/) direktno na glavnu aplikaciju (/app)
export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Preusmjeri na glavnu aplikaciju
    router.replace("/app");
  }, [router]);
  
  // Prikaži loading dok se preusmjerava
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1A1A1A]">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-2xl" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
          CORP<span className="text-purple-400">EX</span>
        </h1>
        <p className="text-white/70">Preusmjeravam...</p>
      </div>
    </div>
  );
}
