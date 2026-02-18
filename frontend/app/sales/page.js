"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { salesAPI } from "@/services/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Receipt, Loader2, Calculator, User, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

function QuickSaleContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    total: "",
    paid: "",
    customer: "",
    customerEmail: "",
    sendEmail: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const total = parseFloat(form.total) || 0;
      const paid = parseFloat(form.paid) || 0;
      
      if (total <= 0) {
        toast.error("Please enter a valid total");
        setLoading(false);
        return;
      }

      await salesAPI.quickSale({
        total,
        paid,
        customer: form.customer || "Walk-in Customer",
        sendEmail: form.sendEmail,
        customerEmail: form.customerEmail
      });

      toast.success("Sale recorded successfully!");
      setForm({ total: "", paid: "", customer: "" });
      
      // Redirect to history after a short delay
      setTimeout(() => {
        router.push("/sales/history");
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record sale");
    } finally {
      setLoading(false);
    }
  };

  const debt = Math.max(0, (parseFloat(form.total) || 0) - (parseFloat(form.paid) || 0));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Receipt className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Quick Sale</h1>
            <p className="text-sm text-zinc-500">Record a new transaction</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Total Amount *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.total}
                onChange={(e) => setForm({ ...form, total: e.target.value })}
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-lg"
              />
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Amount Paid
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.paid}
                onChange={(e) => setForm({ ...form, paid: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-lg"
              />
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Customer Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Walk-in Customer"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Send Receipt via Email */}
          <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendEmail}
                onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
                className="w-5 h-5 rounded border-zinc-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-zinc-300">Send receipt via email</span>
            </label>
            
            {form.sendEmail && (
              <div className="mt-3">
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            )}
          </div>

          {/* Debt Display */}
          {debt > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-medium">Outstanding Debt</span>
                <span className="text-xl font-bold text-amber-400">{formatCurrency(debt)}</span>
              </div>
              <p className="text-xs text-amber-400/70 mt-1">
                This debt will be recorded for customer tracking
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Receipt size={20} />
                Record Sale
              </>
            )}
          </button>
        </form>
      </div>

      {/* Quick Tips */}
      <div className="mt-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <h3 className="text-sm font-medium text-white mb-2">Quick Tips</h3>
        <ul className="text-xs text-zinc-500 space-y-1">
          <li>• Leave "Amount Paid" empty to record full payment</li>
          <li>• Any unpaid amount will be tracked as debt</li>
          <li>• Customer name is optional - defaults to "Walk-in Customer"</li>
        </ul>
      </div>
    </div>
  );
}

export default function QuickSale() {
  return (
    <ProtectedRoute>
      <QuickSaleContent />
    </ProtectedRoute>
  );
}
