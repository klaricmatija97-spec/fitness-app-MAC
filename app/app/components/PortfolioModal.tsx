"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioData: any;
  userName: string;
  userInitials: string;
}

export default function PortfolioModal({
  isOpen,
  onClose,
  portfolioData,
  userName,
  userInitials,
}: PortfolioModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("hr-HR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSubscriptionStatus = () => {
    if (!portfolioData?.subscription) return { status: "Nema pretplate", color: "text-gray-600" };
    const endDate = new Date(portfolioData.subscription.end_date);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { status: "Istekla", color: "text-red-600" };
    if (daysLeft <= 7) return { status: `Istječe za ${daysLeft} ${daysLeft === 1 ? 'dan' : 'dana'}`, color: "text-orange-600" };
    return { status: `Aktivna do ${formatDate(portfolioData.subscription.end_date)}`, color: "text-green-600" };
  };

  const subscriptionStatus = getSubscriptionStatus();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Smooth Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            style={{ willChange: "opacity" }}
          />
          
          {/* Modal - Smooth Fade + Scale */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 px-8 py-6 border-b border-[#E8E8E8] bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white text-[#1A1A1A] font-bold text-2xl flex items-center justify-center shadow-lg">
                      {userInitials}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{userName || "Korisnik"}</h2>
                      <p className="text-sm text-gray-300">Moj portofolio</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center"
                    aria-label="Zatvori"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="space-y-6">
                  {/* Pretplata */}
                  <div className="rounded-[20px] bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">Pretplata</h3>
                    <p className={`text-lg font-semibold ${subscriptionStatus.color}`}>
                      {subscriptionStatus.status}
                    </p>
                    {portfolioData?.subscription && (
                      <div className="mt-4 text-sm text-gray-300">
                        <p>Počela: {formatDate(portfolioData.subscription.start_date)}</p>
                        {portfolioData.subscription.end_date && (
                          <p>Ističe: {formatDate(portfolioData.subscription.end_date)}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Odrađeni treningi */}
                  <div className="rounded-[20px] bg-white border-2 border-[#E8E8E8] p-6">
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Odrađeni treningi</h3>
                    {portfolioData?.trainings && portfolioData.trainings.length > 0 ? (
                      <div className="space-y-3">
                        {portfolioData.trainings.slice(0, 10).map((training: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-[14px] bg-[#F8F9FA] p-4 border border-[#E8E8E8]"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-[#1A1A1A]">
                                  {training.name || `Trening ${idx + 1}`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {training.date ? formatDate(training.date) : "—"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-[#1A1A1A]">
                                  {training.duration || "—"} min
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">Još nema odrađenih treninga</p>
                    )}
                  </div>

                  {/* Plan prehrane */}
                  <div className="rounded-[20px] bg-white border-2 border-[#E8E8E8] p-6">
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Plan prehrane</h3>
                    {portfolioData?.meals ? (
                      <div className="space-y-3">
                        {portfolioData.meals.days && portfolioData.meals.days.length > 0 ? (
                          portfolioData.meals.days.slice(0, 7).map((day: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-[14px] bg-[#F8F9FA] p-4 border border-[#E8E8E8]"
                            >
                              <p className="font-semibold text-[#1A1A1A] mb-2">Dan {day.day}</p>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div>Doručak: {day.breakfast?.totalCalories || 0} kcal</div>
                                <div>Ručak: {day.lunch?.totalCalories || 0} kcal</div>
                                <div>Večera: {day.dinner?.totalCalories || 0} kcal</div>
                                <div>Užine: {day.snacks?.totalCalories || 0} kcal</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-600">Plan prehrane nije kreiran</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600">Plan prehrane nije dostupan</p>
                    )}
                  </div>

                  {/* Podaci */}
                  <div className="rounded-[20px] bg-white border-2 border-[#E8E8E8] p-6">
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Moji podaci</h3>
                    {portfolioData?.client ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Email</p>
                          <p className="font-medium text-[#1A1A1A]">
                            {portfolioData.client.email || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Telefon</p>
                          <p className="font-medium text-[#1A1A1A]">
                            {portfolioData.client.phone || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Težina</p>
                          <p className="font-medium text-[#1A1A1A]">
                            {portfolioData.client.weight_value || "—"}{" "}
                            {portfolioData.client.weight_unit || ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Visina</p>
                          <p className="font-medium text-[#1A1A1A]">
                            {portfolioData.client.height_value || "—"}{" "}
                            {portfolioData.client.height_unit || ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Dobna skupina</p>
                          <p className="font-medium text-[#1A1A1A]">
                            {portfolioData.client.age_range || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Ciljevi</p>
                          <p className="font-medium text-[#1A1A1A]">
                            {portfolioData.client.goals?.join(", ") || "—"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600">Podaci nisu dostupni</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



