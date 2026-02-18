"use client";

import { useState, useRef, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { aiAPI } from "@/services/api";
import { formatCurrency } from "@/lib/currency";
import { Brain, Send, Loader2, Sparkles, Lightbulb, TrendingUp, Target, Package, AlertTriangle, Calendar, ArrowUp, ArrowDown } from "lucide-react";

function AIContent() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI business assistant. Ask me anything about your business - sales, inventory, finances, or get strategic advice. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Load summary and insights on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, insightsRes] = await Promise.all([
          aiAPI.getSummary().catch(() => ({ data: {} })),
          aiAPI.getInsights().catch(() => ({ data: { insights: [] } }))
        ]);
        setSummary(summaryRes.data);
        setInsights(insightsRes.data?.insights || []);
      } catch (error) {
        console.error("Error fetching AI data:", error);
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await aiAPI.ask(userMessage);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: res.data?.answer || "I apologize, but I couldn't generate a response. Please try again."
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I encountered an error. Please make sure you have sales data and try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    { icon: TrendingUp, text: "How much did I earn this week?" },
    { icon: Target, text: "Who are my best customers?" },
    { icon: Package, text: "Which products are low in stock?" },
  ];

  const getInsightIcon = (type) => {
    switch (type) {
      case "low-stock": return <AlertTriangle size={18} className="text-amber-400" />;
      case "slow-moving": return <Package size={18} className="text-blue-400" />;
      case "best-day": return <Calendar size={18} className="text-green-400" />;
      case "debt": return <AlertTriangle size={18} className="text-red-400" />;
      default: return <Lightbulb size={18} className="text-purple-400" />;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Brain className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">AI Assistant</h1>
            <p className="text-sm text-zinc-500">Get smart business insights</p>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {msg.role === "assistant" && (
                      <Sparkles size={18} className="text-purple-400 mt-0.5 flex-shrink-0" />
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-zinc-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(q.text);
                      document.getElementById("ai-input")?.focus();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    <q.icon size={14} />
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <input
                id="ai-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your business..."
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sidebar - Summary & Insights */}
      <div className="w-full lg:w-80 space-y-4">
        {/* Business Summary */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-400" />
            Business Summary
          </h3>
          
          {loadingSummary ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={24} className="animate-spin text-zinc-500" />
            </div>
          ) : summary ? (
            <div className="space-y-3">
              {/* Revenue Card */}
              <div className="p-3 rounded-xl bg-zinc-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-400 text-sm">This {summary.period}</span>
                  {summary.revenue?.isPositive !== undefined && (
                    <span className={`flex items-center text-xs ${summary.revenue.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {summary.revenue.isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      {Math.abs(summary.revenue.change)}%
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(summary.revenue?.total || 0)}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
                  <p className="text-zinc-500 text-xs">Transactions</p>
                  <p className="text-white font-semibold">{summary.transactions?.count || 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
                  <p className="text-zinc-500 text-xs">Avg Sale</p>
                  <p className="text-white font-semibold">{formatCurrency(summary.transactions?.avgValue || 0)}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
                  <p className="text-zinc-500 text-xs">Debts</p>
                  <p className="text-amber-400 font-semibold">{formatCurrency(summary.debts?.total || 0)}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-800/50 text-center">
                  <p className="text-zinc-500 text-xs">Products</p>
                  <p className="text-white font-semibold">{summary.inventory?.items || 0}</p>
                </div>
              </div>

              {/* AI Summary */}
              {summary.aiSummary && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-1">AI Insight</p>
                  <p className="text-sm text-zinc-300">{summary.aiSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">No data available</p>
          )}
        </div>

        {/* AI Insights */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-400" />
            Smart Insights
          </h3>
          
          {insights.length > 0 ? (
            <div className="space-y-2">
              {insights.map((insight, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-800/50 border-l-2"
                  style={{ 
                    borderColor: insight.severity === 'warning' ? '#f59e0b' : 
                                 insight.severity === 'success' ? '#22c55e' : '#3b82f6'
                  }}
                >
                  <div className="flex items-start gap-2">
                    {getInsightIcon(insight.type)}
                    <div>
                      <p className="text-sm font-medium text-white">{insight.title}</p>
                      <p className="text-xs text-zinc-400 mt-1">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">No insights available yet. Start recording sales to get AI-powered recommendations.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AI() {
  return (
    <ProtectedRoute>
      <AIContent />
    </ProtectedRoute>
  );
}
