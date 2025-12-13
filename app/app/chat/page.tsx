"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

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

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (data.usage.isAtLimit || data.usage.isNearLimit) {
          setShowLimitWarning(true);
        }
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    }
  };

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    
    // Za pregled, omogući pristup bez clientId
    // if (!clientId) {
    //   router.push("/login");
    //   return;
    // }

    // Učitaj prethodne poruke (ako postoji clientId)
    if (clientId) {
      fetch(`/api/chat/${clientId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.messages) {
            setMessages(data.messages.map((m: any) => ({
              role: m.message ? "user" : "assistant",
              content: m.message || m.response,
            })));
          }
        })
        .catch(() => {});
      
      // Učitaj usage
      fetchUsage();
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const clientId = localStorage.getItem("clientId") || "00000000-0000-0000-0000-000000000000";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, message: userMessage }),
      });

      const data = await res.json();
      
      if (data.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
        await fetchUsage();
      } else {
        // Provjeri da li je limit dosegnut
        if (data.limitExceeded) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `⚠️ ${data.message}\n\nPreostalo zahtjeva: ${data.usage?.remainingRequests || 0}\nPreostalo tokena: ${data.usage?.remainingTokens || 0}\n\nLimit će se resetirati sutra u ponoć.`,
            },
          ]);
          setShowLimitWarning(true);
          await fetchUsage();
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Greška pri slanju poruke." }]);
        }
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Greška pri slanju poruke." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
        AI Chat
      </h1>
        {usage && (
          <div className="text-sm text-gray-600">
            <span className={usage.isAtLimit ? "text-red-600 font-semibold" : usage.isNearLimit ? "text-yellow-600" : ""}>
              {usage.requests}/{usage.dailyRequestLimit} zahtjeva
            </span>
          </div>
        )}
      </div>

      {/* Limit Warning Banner */}
      {showLimitWarning && usage && (
        <div
          className={`mb-4 p-4 rounded-2xl ${
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
        </div>
      )}

      <div className="flex-1 rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              Počni razgovor - pitaj bilo što o prehrani i treningu!
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-2">
                Piše...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`flex-1 rounded-2xl border bg-white px-4 py-3 text-gray-900 focus:outline-none ${
                usage?.isAtLimit
                  ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 focus:border-gray-900"
              }`}
              placeholder={
                usage?.isAtLimit
                  ? "Limit dosegnut - pokušaj sutra"
                  : "Pitaj bilo što..."
              }
              disabled={loading || usage?.isAtLimit}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || usage?.isAtLimit}
              className="rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-6 py-3 text-white font-semibold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pošalji
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

