"use client";

import HeroSection from "../app/components/HeroSection";
import FadeInSection from "../app/components/FadeInSection";
import Footer from "../components/Footer";

export default function LandingPage() {
  const handleCtaClick = () => {
    // Navigate to your intake form or contact page
    window.location.href = "/app";
  };

  return (
    <>
      {/* Hero Section */}
      <HeroSection
        backgroundImage="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80&auto=format&fit=crop"
        kicker="MALI POMACI U NAVIKAMA, VELIKI POMACI U ENERGIJI."
        heading="Prehrana koja radi za tebe, ne protiv tebe"
        subheading="Ne moraš na dijeti da bi napredovao. Fokus je na hrani koja ti daje energiju bez stresa i brojanja kalorija."
        ctaText="Započni besplatan razgovor"
        onCtaClick={handleCtaClick}
      />

      {/* Example Section Below Hero - with fade-in on scroll */}
      <FadeInSection>
        <section style={{ padding: "4rem 2rem", backgroundColor: "#f9fafb", minHeight: "50vh" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem", fontFamily: "var(--font-inter), sans-serif" }}>
              O nama
            </h2>
            <p style={{ fontSize: "1.125rem", lineHeight: 1.7, color: "#4b5563", fontFamily: "var(--font-inter), sans-serif" }}>
              Naša misija je pomoći vam da postignete svoje ciljeve kroz personalizirane planove prehrane i treninga.
            </p>
          </div>
        </section>
      </FadeInSection>

      {/* Another Example Section */}
      <FadeInSection>
        <section style={{ padding: "4rem 2rem", backgroundColor: "#ffffff", minHeight: "50vh" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem", fontFamily: "var(--font-inter), sans-serif" }}>
              Kako radimo
            </h2>
            <p style={{ fontSize: "1.125rem", lineHeight: 1.7, color: "#4b5563", fontFamily: "var(--font-inter), sans-serif" }}>
              Kroz detaljni upitnik razumijemo vaše ciljeve, navike i životni stil, a zatim kreiramo plan prilagođen upravo vama.
            </p>
          </div>
        </section>
      </FadeInSection>
      <Footer />
    </>
  );
}


