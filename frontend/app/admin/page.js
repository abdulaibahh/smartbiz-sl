"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/providers/AuthContext";
import { platformAPI } from "@/services/api";
import { 
  Shield, 
  Building2, 
  DollarSign, 
  Users, 
  TrendingUp,
  Search,
  Loader2,
  Crown
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

function AdminContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, businessesRes, revenueRes] = await Promise.all([
          platformAPI.getStats().catch(() => ({ data: {} })),
          platformAPI.getBusinesses().catch(() => ({ data: [] })),
          platformAPI.getRevenue().catch(() => ({ data: {} }))
        ]);
        setStats(statsRes.data);
        setBusinesses(businessesRes.data || []);
        setRevenue(revenueRes.data);
      } catch (error) {
        console.error("Error fetching admin data:", error);
        // Demo mode
        setStats({
          totalBusinesses: 42,
          activeSubscriptions: 28,
          totalRevenueAcrossPlatform: 125000
        });
        setBusinesses([
          { id: 1, name: "Demo Business 1", subscription_active: true, trial_end: "2026-03-15" },
          { id: 2, name: "Demo Business 2", subscription_active: false, trial_end: "2026-02-20" },
          { id: 3, name: "Demo Business 3", subscription_active: true, trial_end: "2026-04-01" },
        ]);
        setRevenue({ payingBusinesses: 28, estimatedMonthlyRevenue: 532 });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredBusinesses = useMemo(() => {
    if (!search) return businesses;
    return businesses.filter(b => 
      b.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [businesses, search]);

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={40} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <Shield className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-zinc-500">Platform management & analytics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Total Businesses</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.totalBusinesses || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Active Subscriptions</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{stats?.activeSubscriptions || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Crown className="text-emerald-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Platform Revenue</p>
              <p className="text-3xl font-bold text-purple-400 mt-1">
                {formatCurrency(stats?.totalRevenueAcrossPlatform)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <DollarSign className="text-purple-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Monthly Revenue</p>
              <p className="text-3xl font-bold text-indigo-400 mt-1">
                {formatCurrency(revenue?.estimatedMonthlyRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="text-indigo-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Businesses</h3>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search businesses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/30">
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Business Name</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Trial End</th>
              </tr>
            </thead>
            <tbody>
              {filteredBusinesses.length > 0 ? (
                filteredBusinesses.map((biz) => (
                  <tr key={biz.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-4">
                      <p className="text-white font-medium">{biz.name}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        biz.subscription_active 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {biz.subscription_active ? "Active" : "Trial"}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-zinc-400 text-sm">{formatDate(biz.trial_end)}</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-zinc-500">
                    No businesses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}
