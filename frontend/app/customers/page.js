"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { salesAPI } from "@/services/api";
import { Users, Search, ShoppingCart, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

function CustomersContent() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await salesAPI.getAll();
        setSales(res.data || []);
      } catch (error) {
        console.error("Error fetching sales:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  // Aggregate customers from sales
  const customers = useMemo(() => {
    const customerMap = {};
    sales.forEach(sale => {
      const name = sale.customer || "Walk-in Customer";
      if (!customerMap[name]) {
        customerMap[name] = {
          name,
          totalSpent: 0,
          totalPaid: 0,
          purchaseCount: 0,
          lastPurchase: sale.created_at
        };
      }
      customerMap[name].totalSpent += parseFloat(sale.total) || 0;
      customerMap[name].totalPaid += parseFloat(sale.paid) || 0;
      customerMap[name].purchaseCount += 1;
      if (new Date(sale.created_at) > new Date(customerMap[name].lastPurchase)) {
        customerMap[name].lastPurchase = sale.created_at;
      }
    });
    return Object.values(customerMap);
  }, [sales]);

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    const lower = search.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(lower));
  }, [customers, search]);

  const formatDate = (date) => 
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Customers</p>
              <p className="text-2xl font-bold text-white">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="text-emerald-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(customers.reduce((s, c) => s + c.totalSpent, 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <ShoppingCart className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Orders</p>
              <p className="text-2xl font-bold text-white">
                {customers.reduce((s, c) => s + c.purchaseCount, 0)}
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
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Customer List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {filteredCustomers.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {filteredCustomers.map((customer, idx) => (
              <div key={idx} className="p-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Users className="text-zinc-500" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{customer.name}</p>
                      <p className="text-sm text-zinc-500">
                        {customer.purchaseCount} purchases • Last: {formatDate(customer.lastPurchase)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(customer.totalPaid)} paid
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-500">No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Customers() {
  return (
    <ProtectedRoute>
      <CustomersContent />
    </ProtectedRoute>
  );
}
