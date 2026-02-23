"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/providers/LanguageContext";
import { customerAPI } from "@/services/api";
import { notifySuccess, notifyError } from "@/app/components/useToast";

import { Users, Plus, Search, Phone, Mail, History, Trash2, Edit2, X, Check } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/formatDate";

function CustomersContent() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);


  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: ""
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerAPI.getAll();
      setCustomers(res.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      notifyError("Failed to load customers");

    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customerAPI.update(editingCustomer.id, form);
      notifySuccess("Customer updated successfully!");

      } else {
        await customerAPI.create(form);
      notifySuccess("Customer added successfully!");

      }
      setForm({ name: "", phone: "", email: "" });
      setShowAddModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      notifyError(error.response?.data?.message || "Failed to save customer");

    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    
    try {
      await customerAPI.delete(id);
      notifySuccess("Customer deleted successfully!");

      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      notifyError("Failed to delete customer");

    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || ""
    });
    setShowAddModal(true);
  };

  const viewHistory = async (customer) => {
    try {
      setSelectedCustomer(customer);
      const res = await customerAPI.getHistory(customer.id);
      // Ensure customerHistory is always an array
      const historyData = res.data;
      setCustomerHistory(Array.isArray(historyData) ? historyData : []);
      setShowHistoryModal(true);
    } catch (error) {
      console.error("Error fetching customer history:", error);
      notifyError("Failed to load customer history");
      setCustomerHistory([]);
    }
  };


  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('customers.title')}</h1>
          <p className="text-zinc-400 mt-1">{t('customers.manageDatabase')}</p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setForm({ name: "", phone: "", email: "" });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          <Plus size={20} />
          {t('customers.addCustomer')}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input
          type="text"
          placeholder={t('customers.searchCustomers')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <Users className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">{t('customers.noCustomers')}</h3>
          <p className="text-zinc-500">
            {searchTerm ? t('customers.tryAdjusting') : t('customers.getStarted')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
                    <span className="text-indigo-400 font-semibold">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{customer.name}</h3>
                    {customer.total_spent !== undefined && (
                      <p className="text-sm text-zinc-400">
                        {t('customers.totalSpent')} {formatCurrency(customer.total_spent || 0)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Phone size={14} />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Mail size={14} />
                    <span>{customer.email}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => viewHistory(customer)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
              >
                <History size={16} />
                {t('customers.viewPurchaseHistory')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCustomer(null);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('common.name')} *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder={t('common.name')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('common.phone')}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder={t('common.phone')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder={t('common.email')}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCustomer(null);
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  {editingCustomer ? t('common.update') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {t('customers.purchaseHistory')}
                </h2>
                <p className="text-zinc-400 text-sm">{selectedCustomer.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedCustomer(null);
                  setCustomerHistory([]);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {customerHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
                <p className="text-zinc-500">{t('customers.noHistory')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerHistory.map((sale, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {formatCurrency(sale.total || 0)}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {formatDate(sale.created_at)}
                      </p>
                      {sale.items && sale.items.length > 0 && (
                        <p className="text-xs text-zinc-500 mt-1">
                          {sale.items.map(i => i.product).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sale.paid >= sale.total
                          ? "bg-green-500/20 text-green-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {sale.paid >= sale.total ? t('common.paid') : t('customers.partial')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
