"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

const FAQS: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["join", "member", "register", "membership"],
    answer:
      "To become a member, visit the Membership page and complete the registration form. You'll receive a membership number, QR code, and digital membership card upon approval. Go to /membership to get started!",
  },
  {
    keywords: ["volunteer", "hours", "badge"],
    answer:
      "Join our Volunteer Portal to register, track hours, earn digital badges, and download certificates. Visit /volunteer for details and active opportunities.",
  },
  {
    keywords: ["event", "summit", "register event"],
    answer:
      "Browse upcoming events at /events. You can register online, get QR tickets, and set reminders. The National Youth Summit 2025 is our flagship event this September!",
  },
  {
    keywords: ["program", "training", "skill"],
    answer:
      "We offer 11 programs including Leadership, Patriotism, Entrepreneurship, Agriculture, Innovation, ICT, Climate Action, Community Service, Sports, Arts & Culture, and Education. Explore them at /programs.",
  },
  {
    keywords: ["donate", "donation", "fund", "support", "momo", "pay", "payment"],
    answer:
      "Donate at /donate using MTN MoMo. Choose MoMo Pay (QR/button) or Request to Pay with your phone number — you approve the charge on your phone. Contributions support scholarships, projects, and youth training.",
  },
  {
    keywords: ["contact", "phone", "email", "location", "address", "whatsapp", "group"],
    answer:
      "Join our official WhatsApp group first: https://chat.whatsapp.com/H7GOLHTLRYQ5IPSomBEu52 — for events, opportunities, and community chat. You can also reach us at info@pyu.ug or +256 700 000 000. Office: Plot 1, Parliamentary Avenue, Kampala. Full details at /contact.",
  },
  {
    keywords: ["join group", "community", "chat group"],
    answer:
      "Enter the official PYU WhatsApp community here: https://chat.whatsapp.com/H7GOLHTLRYQ5IPSomBEu52 — stay updated on events, trainings, and opportunities nationwide!",
  },
  {
    keywords: ["scholarship", "job", "internship", "opportunity"],
    answer:
      "Check Opportunities at /opportunities for jobs, scholarships, internships, competitions, grants, and training. The Girls in STEM Scholarship 2025 is currently open!",
  },
  {
    keywords: ["district", "chapter", "map"],
    answer:
      "We have presence in all 146 districts of Uganda. Use the interactive map on the homepage to explore membership, projects, and events by district.",
  },
  {
    keywords: ["hello", "hi", "hey", "help"],
    answer:
      "Hello! 👋 I'm the PYU AI Assistant. I can help with membership, programs, events, volunteering, donations, and more. What would you like to know?",
  },
];

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const faq of FAQS) {
    if (faq.keywords.some((k) => lower.includes(k))) {
      return faq.answer;
    }
  }
  return "Thank you for your question! For specific inquiries, please visit /contact or email info@pyu.ug. I can help with membership, programs, events, volunteering, donations, scholarships, and more. Try asking about one of those topics!";
}

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Welcome to Patriotic Youths of Uganda! 🇺🇬 I'm your AI assistant. Ask me about membership, programs, events, volunteering, or anything else.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(userMsg.content),
        timestamp: new Date().toISOString(),
      };
      setMessages((m) => [...m, reply]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-shadow",
          open && "hidden"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open AI chat assistant"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-yellow-400" />
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl"
            role="dialog"
            aria-label="AI Chat Assistant"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div>
                  <p className="text-sm font-semibold">PYU Assistant</p>
                  <p className="text-[10px] opacity-80">Always here to help</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/20 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      msg.role === "user"
                        ? "bg-emerald-500/20 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {msg.role === "user" ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-emerald-600 text-white rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border/50 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  aria-label="Chat message"
                />
                <Button type="submit" size="icon" className="shrink-0 rounded-xl" disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
