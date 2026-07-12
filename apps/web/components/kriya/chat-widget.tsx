"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Minus } from "lucide-react";
import { useAuth } from "./auth-provider";
import { useLanguage } from "./language-provider";
import { cn } from "@/lib/utils";

interface Source {
  type: "product" | "guide" | "faq" | "policy";
  ref: string;
}

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  sources?: Source[];
}

export function ChatWidget() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      content: t("chat.greeting" as any),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // simple session id generator
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMsg },
    ]);
    
    setLoading(true);

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_CHAT_WEBHOOK_URL;
      
      if (!webhookUrl || webhookUrl.includes("localhost:5678")) {
        // Mock if webhook is not really ready
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "bot",
              content: t("chat.offline" as any),
            }
          ]);
          setLoading(false);
        }, 1000);
        return;
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMsg,
          user: user ? { email: user.email } : null,
        }),
      });

      if (!res.ok) throw new Error("Gagal mengirim pesan");
      
      const data = await res.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          content: data.reply || "Maaf, saya tidak mengerti.",
          sources: data.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          content: t("chat.error" as any),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-strong text-white shadow-lg transition-transform hover:scale-105",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 flex h-[500px] max-h-[calc(100vh-2rem)] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between bg-brand-strong px-4 py-3 text-white">
          <div>
            <h3 className="font-semibold text-sm">{t("chat.title" as any)}</h3>
            <p className="text-xs text-brand-tint/80">{t("chat.subtitle" as any)}</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 hover:bg-white/20 text-white"
          >
            <Minus className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-col items-end" : "mr-auto flex-col items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-brand-strong text-white rounded-br-none"
                    : "bg-white border border-neutral-200 text-neutral-800 rounded-bl-none shadow-sm"
                )}
              >
                {msg.content}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {msg.sources.map((src, i) => (
                    <span
                      key={i}
                      className="inline-flex rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-neutral-500"
                    >
                      {src.type}: {src.ref}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="mr-auto flex max-w-[85%] flex-col items-start">
              <div className="rounded-2xl rounded-bl-none border border-neutral-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-300" style={{ animationDelay: "0ms" }} />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-300" style={{ animationDelay: "150ms" }} />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-300" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-neutral-200 bg-white p-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.placeholder" as any)}
              className="w-full rounded-full border border-neutral-300 bg-neutral-50 py-2.5 pl-4 pr-12 text-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
