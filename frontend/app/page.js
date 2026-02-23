"use client";

import { useEffect, useState, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/providers/LanguageContext";
import { salesAPI, debtAPI, inventoryAPI } from "@/services/api";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function DashboardContent() {
  const { t } = useLanguage();
  const [sales, setSales] = useState([]);
  const [debts, setDebts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, debtsRes, invRes] = await Promise.all([
          salesAPI.getAll().catch(() => ({ data: [] })),
          debtAPI.getAll().catch(() => ({ data: [] })),
          inventoryAPI.getAll().catch(() => ({ data: [] }))
        ]);
        setSales(salesRes.data || []);
        setDebts(debtsRes.data || []);
        setInventory(invRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate KPIs
  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + (parseFloat(s.paid) || 0), 0);
    const totalDebts = debts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    
    return {
      totalRevenue,
      totalPaid,
      totalDebts,
      todayRevenue,
      todaySalesCount: todaySales.length,
      inventoryCount: inventory.length,
      salesCount: sales.length
    };
  }, [sales, debts, inventory]);

  // Chart data - Last 7 days
  const chartData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toDateString());
    }

    const data = last7Days.map(day => {
      const daySales = sales.filter(s => new Date(s.created_at).toDateString() === day);
      return daySales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
    });

    const labels = last7Days.map(day => {
      const date = new Date(day);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data,
          fill: true,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#6366f1',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#6366f1',
        },
      ],
    };
  }, [sales]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fff',
        bodyColor: '#a1a1aa',
        borderColor: '#3f3f46',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => formatCurrency(context.raw),
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#71717a',
        },
      },
      y: {
        grid: {
          color: '#27272a',
        },
        ticks: {
          color: '#71717a',
          callback: (value) => formatCurrency(value),
        },
      },
    },
  };

  // Recent sales
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [sales]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-sm">{t('dashboard.todaysSales')}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(stats.todayRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Receipt className="text-indigo-400" size={24} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-emerald-400 flex items-center">
              <ArrowUpRight size={16} />
              {stats.todaySalesCount}
            </span>
            <span className="text-zinc-500">{t('dashboard.transactionsToday')}</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-sm">{t('dashboard.totalRevenue')}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="text-emerald-400" size={24} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-zinc-500">{stats.salesCount} {t('dashboard.totalTransactions')}</span>
          </div>
        </div>

        {/* Pending Debts */}
        <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-sm">{t('dashboard.pendingDebts')}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(stats.totalDebts)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ShoppingCart className="text-amber-400" size={24} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-zinc-500">{debts.length} {t('dashboard.outstanding')}</span>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-sm">{t('dashboard.inventoryItems')}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.inventoryCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Package className="text-purple-400" size={24} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <span className="text-zinc-500">{t('dashboard.productsTracked')}</span>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{t('dashboard.revenueOverview')}</h3>
            <span className="text-sm text-zinc-500">{t('dashboard.last7Days')}</span>
          </div>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.recentSales')}</h3>
          <div className="space-y-3">
            {recentSales.length > 0 ? (
              recentSales.map((sale, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <Receipt className="text-indigo-400" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {sale.customer || t('sales.walkInCustomer')}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(sale.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {formatCurrency(sale.total)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('dashboard.noSalesYet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-zinc-900/80 backdrop-blur-lg border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.quickActions')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a href="/sales" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 transition-colors">
            <Receipt className="text-indigo-400" size={24} />
            <span className="text-sm font-medium text-white">{t('dashboard.newSale')}</span>
          </a>
          <a href="/inventory/add" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 transition-colors">
            <Package className="text-emerald-400" size={24} />
            <span className="text-sm font-medium text-white">{t('dashboard.addStock')}</span>
          </a>
          <a href="/debt" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 transition-colors">
            <ShoppingCart className="text-amber-400" size={24} />
            <span className="text-sm font-medium text-white">{t('dashboard.recordDebt')}</span>
          </a>
          <a href="/ai" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 transition-colors">
            <TrendingUp className="text-purple-400" size={24} />
            <span className="text-sm font-medium text-white">{t('dashboard.askAI')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
