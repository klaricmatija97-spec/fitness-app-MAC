"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { SlideProvider, useSlides } from "./slide-context";

function AppLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [clientInitials, setClientInitials] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showSlideMenu, setShowSlideMenu] = useState(false);
  
  // Pokušaj dohvatiti slideove iz contexta (samo ako je na /app stranici)
  let slides: { id: string; title: string }[] = [];
  let currentSlide = 0;
  let setCurrentSlide: ((slide: number) => void) | null = null;
  
  try {
    const slideContext = useSlides();
    slides = slideContext.slides;
    currentSlide = slideContext.currentSlide;
    setCurrentSlide = slideContext.setCurrentSlide;
  } catch {
    // Nije u contextu, to je u redu
  }
  
  const isAppPage = pathname === "/app";

  // Zatvori meni kada se klikne izvan njega
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSlideMenu && !target.closest('.slide-menu-container')) {
        setShowSlideMenu(false);
      }
    };

    if (showSlideMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSlideMenu]);

  useEffect(() => {
    // Provjeri autentifikaciju (omogući pregled bez login-a)
    const token = localStorage.getItem("authToken");
    const clientId = localStorage.getItem("clientId");
    
    // Za pregled, omogući pristup bez autentifikacije
    // U produkciji, ukloni ovaj komentar
    // if (!token || !clientId) {
    //   router.push("/login");
    //   return;
    // }

    // Dohvati inicijale korisnika (samo ako postoji clientId)
    if (clientId) {
      fetch(`/api/client/${clientId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.name) {
            const names = data.name.split(" ");
            const initials = names.map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            setClientInitials(initials);
          }
        })
        .catch(() => {
          // Za pregled, postavi default inicijale
          setClientInitials("U");
        });
    } else {
      // Za pregled bez login-a
      setClientInitials("U");
    }
  }, [router]);

  // Provjeri je li na intro slideu
  const isIntroSlide = isAppPage && currentSlide === 0;

  // Dodaj/ukloni slide-based-layout klasu na body ovisno o pathname
  useEffect(() => {
    if (isAppPage) {
      document.body.classList.add('slide-based-layout');
    } else {
      document.body.classList.remove('slide-based-layout');
    }
    
    return () => {
      document.body.classList.remove('slide-based-layout');
    };
  }, [isAppPage]);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav bar je sada potpuno skriven jer sve navigacije se rade unutar app/page.tsx */}
      <nav className="hidden">
        {/* Navigation je sada u app/page.tsx */}
      </nav>
      
      <main className={isAppPage ? "h-screen overflow-hidden" : "min-h-screen overflow-y-auto"}>{children}</main>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SlideProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SlideProvider>
  );
}

