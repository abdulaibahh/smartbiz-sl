"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { inventoryAPI } from "@/services/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Package, Loader2, Truck, DollarSign } from "lucide-react";

function AddStockContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    product: "",
    quantity: "",
    cost_price: "",
    selling_price: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await inventoryAPI.supplierOrder({
        product: form.product,
        quantity: parseInt(form.quantity) || 1,
        cost_price: parseFloat(form.cost_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0
      });

      toast.success("Stock added successfully!");
      setForm({ product: "", quantity: "", cost_price: "", selling_price: "" });
      
      setTimeout(() => {
        router.push("/inventory");
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Truck className="text-emerald-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Add Stock</h1>
            <p className="text-sm text-zinc-500">Record supplier order / restock</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Product Name *
            </label>
            <div className="relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Enter product name"
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              placeholder="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-lg"
            />
          </div>

          {/* Cost Price and Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Cost Price (NLE)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Selling Price (NLE) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.selling_price}
                  onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Profit Preview */}
          {form.cost_price && form.selling_price && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 text-sm">Profit per unit:</span>
                <span className="text-emerald-400 font-bold">
                  NLE {(parseFloat(form.selling_price) - parseFloat(form.cost_price)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-400">
              This will add to your inventory. If the product already exists, quantity will be added to the existing stock.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Adding Stock...
              </>
            ) : (
              <>
                <Package size={20} />
                Add to Inventory
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AddStock() {
  return (
    <ProtectedRoute>
      <AddStockContent />
    </ProtectedRoute>
  );
}
