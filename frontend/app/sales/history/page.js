"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { salesAPI } from "@/services/api";
import { Receipt, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

function SalesHistoryContent() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

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

  // Filter and paginate
  const filteredSales = useMemo(() => {
    if (!search) return sales;
    const lower = search.toLowerCase();
    return sales.filter(s => 
      (s.customer || "").toLowerCase().includes(lower) ||
      String(s.total).includes(lower)
    );
  }, [sales, search]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Calculate totals
  const totals = useMemo(() => {
    return filteredSales.reduce((acc, s) => ({
      total: acc.total + (parseFloat(s.total) || 0),
      paid: acc.paid + (parseFloat(s.paid) || 0),
    }), { total: 0, paid: 0 });
  }, [filteredSales]);

  const formatDate = (date) => 
    new Date(date).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Total Sales</p>
          <p className="text-2xl font-bold text-white">{filteredSales.length}</p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totals.total)}</p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-500">Total Collected</p>
          <p className="text-2xl font-bold text-indigo-400">{formatCurrency(totals.paid)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search by customer or amount..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <button className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
            <Download size={20} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/30">
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Customer</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Total</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Paid</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Debt</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length > 0 ? (
                paginatedSales.map((sale, idx) => {
                  const debt = (parseFloat(sale.total) || 0) - (parseFloat(sale.paid) || 0);
                  return (
                    <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="p-4">
                        <p className="text-white font-medium">{sale.customer || "Walk-in Customer"}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-white font-semibold">{formatCurrency(sale.total)}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-emerald-400">{formatCurrency(sale.paid)}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          debt > 0 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {debt > 0 ? formatCurrency(debt) : "Paid"}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-zinc-500 text-sm">{formatDate(sale.created_at)}</p>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No sales found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredSales.length)} of {filteredSales.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-zinc-400 px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalesHistory() {
  return (
    <ProtectedRoute>
      <SalesHistoryContent />
    </ProtectedRoute>
  );
}
