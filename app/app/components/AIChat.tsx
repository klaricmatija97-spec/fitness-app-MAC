"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UsageInfo {
  requests: number;
  tokens: number;
  cost: number;
  remainingRequests: number;
  remainingTokens: number;
  requestPercentage: number;
  tokenPercentage: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
  dailyRequestLimit: number;
  dailyTokenLimit: number;
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; content: string }>>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // Dohvati trenutnu potrošnju
  const fetchUsage = async () => {
    const clientId = localStorage.getItem("clientId");
    if (!clientId) return;

    try {
      const response = await fetch("/api/chat/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await response.json();
      if (data.ok && data.usage) {
        setUsage(data.usage);
        // Prikaži upozorenje ako je blizu limita ili dosegnut limit
        if (data.usage.isAtLimit) {
          setShowLimitWarning(true);
        } else if (data.usage.isNearLimit) {
          setShowLimitWarning(true);
        }
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsage();
      // Osvježi svakih 10 sekundi dok je chat otvoren
      const interval = setInterval(fetchUsage, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    const clientId = localStorage.getItem("clientId");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId || "", message: userMessage }),
      });
      const data = await response.json();
      
      if (data.ok) {
        setMessages((prev) => [...prev, { role: "ai", content: data.response }]);
        // Osvježi usage nakon uspješnog zahtjeva
        await fetchUsage();
      } else {
        // Provjeri da li je limit dosegnut
        if (data.limitExceeded) {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: `⚠️ ${data.message}\n\nPreostalo zahtjeva: ${data.usage?.remainingRequests || 0}\nPreostalo tokena: ${data.usage?.remainingTokens || 0}\n\nLimit će se resetirati sutra u ponoć.`,
            },
          ]);
          setShowLimitWarning(true);
          await fetchUsage();
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Oprosti, imam problema s odgovorom. Pokušaj ponovno." },
        ]);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Oprosti, imam problema s povezivanjem. Pokušaj ponovno." },
      ]);
    }
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-8 z-40 w-14 h-14 rounded-full bg-[#1A1A1A] text-white shadow-xl flex items-center justify-center cursor-pointer hover:shadow-2xl hover:scale-105 transition-all"
        aria-label="Otvori AI Chat"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </motion.button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-end justify-end p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-[#1A1A1A] text-white p-6 rounded-t-[24px]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">AI Asistent</h3>
                    <p className="text-sm text-white/70">Pitaj bilo što</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                  >
                    ×
                  </button>
                </div>
                
                {/* Usage Info */}
                {usage && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/70">Današnja potrošnja:</span>
                      <span className={`font-medium ${
                        usage.isAtLimit 
                          ? "text-red-400" 
                          : usage.isNearLimit 
                          ? "text-yellow-400" 
                          : "text-white"
                      }`}>
                        {usage.requests}/{usage.dailyRequestLimit} zahtjeva
                      </span>
                    </div>
                    {usage.isAtLimit && (
                      <div className="mt-2 text-xs text-red-400 font-medium">
                        ⚠️ Dnevni limit je dosegnut! Limit će se resetirati sutra.
                      </div>
                    )}
                    {usage.isNearLimit && !usage.isAtLimit && (
                      <div className="mt-2 text-xs text-yellow-400">
                        ⚠️ Blizu si limita ({usage.requestPercentage}% iskorišteno)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Limit Warning Banner */}
              <AnimatePresence>
                {showLimitWarning && usage && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`mx-6 mt-4 p-4 rounded-[16px] ${
                      usage.isAtLimit
                        ? "bg-red-50 border border-red-200"
                        : "bg-yellow-50 border border-yellow-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            usage.isAtLimit ? "text-red-800" : "text-yellow-800"
                          }`}
                        >
                          {usage.isAtLimit
                            ? "⚠️ Dnevni limit je dosegnut!"
                            : "⚠️ Blizu si dnevnog limita"}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            usage.isAtLimit ? "text-red-600" : "text-yellow-700"
                          }`}
                        >
                          {usage.isAtLimit
                            ? `Iskorišteno: ${usage.requests}/${usage.dailyRequestLimit} zahtjeva. Limit će se resetirati sutra u ponoć.`
                            : `Iskorišteno: ${usage.requests}/${usage.dailyRequestLimit} zahtjeva (${usage.requestPercentage}%). Preostalo: ${usage.remainingRequests} zahtjeva.`}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowLimitWarning(false)}
                        className={`ml-2 text-lg ${
                          usage.isAtLimit ? "text-red-600" : "text-yellow-600"
                        } hover:opacity-70`}
                      >
                        ×
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-sm">Započni razgovor s AI asistentom</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-[16px] p-4 ${
                        msg.role === "user"
                          ? "bg-[#1A1A1A] text-white"
                          : "bg-[#E8E8E8] text-[#1A1A1A]"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder={
                      usage?.isAtLimit
                        ? "Limit dosegnut - pokušaj sutra"
                        : "Upiši poruku..."
                    }
                    disabled={usage?.isAtLimit}
                    className={`flex-1 rounded-[16px] border px-4 py-3 text-sm focus:outline-none ${
                      usage?.isAtLimit
                        ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "border-gray-300 focus:border-[#1A1A1A]"
                    }`}
                  />
                  <button
                    onClick={handleSend}
                    disabled={usage?.isAtLimit}
                    className={`rounded-[16px] px-6 py-3 text-sm font-medium transition ${
                      usage?.isAtLimit
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-[#1A1A1A] text-white hover:opacity-90"
                    }`}
                  >
                    Pošalji
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

