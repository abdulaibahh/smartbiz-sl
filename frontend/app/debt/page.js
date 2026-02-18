"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { debtAPI, salesAPI } from "@/services/api";
import { ShoppingCart, Search, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

function DebtContent() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        const res = await debtAPI.getAll();
        setDebts(res.data || []);
      } catch (error) {
        console.error("Error fetching debts:", error);
        // Try to get debts from local sales
        try {
          const salesRes = await salesAPI.getAll();
          const salesWithDebt = (salesRes.data || []).filter(s => 
            (parseFloat(s.total) || 0) > (parseFloat(s.paid) || 0)
          );
          setDebts(salesWithDebt.map(s => ({
            id: s.id,
            customer: s.customer || "Unknown",
            amount: (parseFloat(s.total) || 0) - (parseFloat(s.paid) || 0),
            created_at: s.created_at
          })));
        } catch (e) {}
      } finally {
        setLoading(false);
      }
    };
    fetchDebts();
  }, []);

  const filteredDebts = useMemo(() => {
    if (!search) return debts;
    const lower = search.toLowerCase();
    return debts.filter(d => 
      (d.customer || "").toLowerCase().includes(lower)
    );
  }, [debts, search]);

  const totals = useMemo(() => {
    return debts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  }, [debts]);

  const formatDate = (date) => 
    new Date(date).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });

  const getDaysOverdue = (date) => {
    const created = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ShoppingCart className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Debts</p>
              <p className="text-2xl font-bold text-white">{debts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Outstanding Amount</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totals)}</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Avg. per Debt</p>
              <p className="text-2xl font-bold text-emerald-400">
                {debts.length > 0 ? formatCurrency(totals / debts.length) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Search by customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Debt List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {filteredDebts.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {filteredDebts.map((debt) => {
              const daysOverdue = getDaysOverdue(debt.created_at);
              return (
                <div key={debt.id} className="p-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <ShoppingCart className="text-amber-400" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{debt.customer || "Unknown Customer"}</p>
                        <p className="text-sm text-zinc-500 flex items-center gap-1">
                          <Clock size={14} />
                          {formatDate(debt.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{formatCurrency(debt.amount)}</p>
                      <span className={`text-xs px-2 py-1 rounded-lg ${
                        daysOverdue > 30 
                          ? "bg-red-500/20 text-red-400" 
                          : daysOverdue > 7 
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-zinc-700 text-zinc-400"
                      }`}>
                        {daysOverdue > 0 ? `${daysOverdue} days` : "Recent"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <ShoppingCart size={48} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-500">No debts found</p>
            <p className="text-sm text-zinc-600 mt-1">
              Debts are created when customers don't pay full amount
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Debt() {
  return (
    <ProtectedRoute>
      <DebtContent />
    </ProtectedRoute>
  );
}
