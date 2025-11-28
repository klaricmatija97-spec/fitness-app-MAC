"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Greška pri slanju poruke." }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Greška pri slanju poruke." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 h-screen flex flex-col">
      <h1 className="text-4xl font-bold text-gray-900 mb-8" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
        AI Chat
      </h1>

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
              className="flex-1 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-gray-900 focus:outline-none"
              placeholder="Pitaj bilo što..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-6 py-3 text-white font-semibold transition hover:opacity-90 disabled:opacity-50"
            >
              Pošalji
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

