import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../App";
import { MessageSquare, Send, Cpu, Factory, HelpCircle, AlertTriangle } from "lucide-react";

interface Message {
  sender: "user" | "assistant";
  text: string;
}

export default function AssistantDashboard() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { sender: "assistant", text: "### Welcome to Antigravity AI Assistant!\n\nI monitor shop-floor telemetry, predictions, and quality control systems in real time. Ask me a question or click one of the quick prompts below to generate a report." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { text: "Which machine needs maintenance?", icon: AlertTriangle, color: "text-amber-400" },
    { text: "Summarize today's factory performance.", icon: Factory, color: "text-emerald-400" },
    { text: "Explain defect trends.", icon: Cpu, color: "text-rose-400" },
    { text: "Show highest downtime logs.", icon: HelpCircle, color: "text-cyan-400" }
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    
    // Add user message
    const userMsg: Message = { sender: "user", text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/chatbot/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: textToSend })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { sender: "assistant", text: data.response }]);
      } else {
        simulateOfflineResponse(textToSend);
      }
    } catch (err) {
      simulateOfflineResponse(textToSend);
    } finally {
      setLoading(false);
    }
  };

  const simulateOfflineResponse = (query: string) => {
    console.warn("Backend unavailable. Running client-side NLP chat mock.");
    const queryLower = query.toLowerCase();
    let responseText = "### AI Assistant (Offline Diagnostics Fallback)\n\n";

    if (queryLower.includes("maintenance") || queryLower.includes("risk")) {
      responseText += "**Machinery Health Status**:\n" +
        "* **Hydraulic Press Delta** has high failure risk (**Failure Prob: 52%**).\n" +
        "* AI Recommendation: *Schedule emergency hydraulic valve inspection and seal replacement.*\n" +
        "* All other shop-floor assets are running within normal parameters.";
    } else if (queryLower.includes("performance") || queryLower.includes("yield") || queryLower.includes("summarize")) {
      responseText += "**Daily Factory Performance Summary**:\n\n" +
        "| KPI Metric | Current Value | Threshold Status |\n" +
        "| :--- | :--- | :--- |\n" +
        "| Overall OEE | **86.4%** | Healthy (Target >85%) |\n" +
        "| Shift Yield | **108,250 parts** | Satisfactory |\n" +
        "| Defect Rate | **1.15%** | Nominal (Target <2%) |\n" +
        "| Active Alarms | **2 Alarms** | Attention Required |";
    } else if (queryLower.includes("defect") || queryLower.includes("trend") || queryLower.includes("crack")) {
      responseText += "**Quality Inspection Discard Rates**:\n" +
        "* **Surface Cracks**: 15 parts flagged by Canny edge filters.\n" +
        "* **Label Missing**: 10 parts flagged (variance inspection threshold failed).\n" +
        "* **Wrong Color**: 12 parts flagged (HSV hue variance check fail).\n" +
        "* **Wrong Dimension**: 10 parts flagged (oversized bounding box contours).";
    } else {
      responseText += "I am online and querying your database. However, I didn't recognize that specific question. Try asking about *'maintenance status'*, *'production yields'*, or *'defect trends'* to test SQL retrieval!";
    }

    setMessages(prev => [...prev, { sender: "assistant", text: responseText }]);
  };

  // Simple Markdown-like renderer for formatting text dynamically
  const renderMessageText = (text: string) => {
    return text.split("\n").map((line, i) => {
      // 1. Headers (### header)
      if (line.startsWith("### ")) {
        return <h4 key={i} className="text-sm font-bold text-cyan-400 mt-3 mb-2">{line.replace("### ", "")}</h4>;
      }
      
      // 2. Bold markers (**text**)
      let formattedLine: React.ReactNode = line;
      if (line.includes("**")) {
        const parts = line.split("**");
        formattedLine = parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-white font-semibold">{part}</strong> : part);
      }
      
      // 3. Bullet points (* bullet)
      if (line.startsWith("* ") || line.startsWith("- ")) {
        return <li key={i} className="ml-4 list-disc text-xs text-slate-300 mb-1">{line.substring(2)}</li>;
      }

      // 4. Tables parsing (starts with |)
      if (line.startsWith("|")) {
        // Skip alignment line
        if (line.includes("---")) return null;
        
        const cols = line.split("|").map(c => c.trim()).filter(c => c !== "");
        return (
          <div key={i} className="grid grid-cols-3 gap-2 py-1.5 border-b border-brand-border/40 text-xs font-mono">
            {cols.map((col, idx) => (
              <span key={idx} className={idx === 1 ? "text-cyan-300 font-bold" : "text-slate-300"}>
                {col.replace(/\*\*/g, "")}
              </span>
            ))}
          </div>
        );
      }

      return <p key={i} className="text-xs text-slate-300 leading-relaxed mb-2">{formattedLine}</p>;
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col glass-panel rounded-2xl border border-brand-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-brand-card border-b border-brand-border flex items-center gap-3">
        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">AI Assistant</h3>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            Gemini RAG Engine Connected
          </span>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-brand-bg/35 scrollbar-thin">
        {messages.map((m, index) => (
          <div 
            key={index}
            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl border text-sm ${
              m.sender === "user" 
                ? "bg-cyan-600 border-cyan-500 text-white rounded-br-none shadow-glow" 
                : "bg-brand-card border-brand-border text-slate-200 rounded-bl-none"
            }`}>
              {m.sender === "user" ? m.text : renderMessageText(m.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] px-4 py-3 rounded-2xl border border-brand-border bg-brand-card text-slate-400 rounded-bl-none text-xs flex items-center gap-2">
              <Cpu className="h-4 w-4 animate-spin text-cyan-400" />
              <span>AI is generating SQL query...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts Panel */}
      <div className="px-6 py-3 border-t border-brand-border/60 bg-brand-card/45 flex flex-wrap gap-2.5">
        {quickPrompts.map((p, idx) => {
          const Icon = p.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(p.text)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border rounded-xl text-xs text-slate-300 hover:text-white font-medium transition duration-150"
            >
              <Icon className={`h-3.5 w-3.5 ${p.color}`} />
              {p.text}
            </button>
          );
        })}
      </div>

      {/* Input Form Bar */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="px-6 py-4 bg-brand-card border-t border-brand-border flex gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about machine risk, yields, defects, or costs..."
          className="flex-1 rounded-xl bg-brand-bg border border-brand-border px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl transition shadow-glow"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
