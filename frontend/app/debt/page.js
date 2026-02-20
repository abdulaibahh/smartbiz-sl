"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { debtAPI, salesAPI, customerAPI } from "@/services/api";
import { ShoppingCart, Search, CheckCircle, Clock, AlertTriangle, Plus, X, User, DollarSign, Calendar, FileText, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import toast from "react-hot-toast";

function DebtContent() {
  const [debts, setDebts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDescription, setDebtDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    fetchDebts();
    fetchCustomers();
  }, []);

  const fetchDebts = async () => {
    try {
      setLoading(true);
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

  const fetchCustomers = async () => {
    try {
      const res = await customerAPI.getAll();
      setCustomers(res.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const filteredDebts = useMemo(() => {
    if (!search) return debts;
    const lower = search.toLowerCase();
    return debts.filter(d => 
      (d.customer || d.customer_name || "").toLowerCase().includes(lower)
    );
  }, [debts, search]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customers, customerSearch]);

  const handleAddDebt = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    
    if (!debtAmount || parseFloat(debtAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await debtAPI.create({
        customer_id: selectedCustomer.id,
        amount: parseFloat(debtAmount),
        description: debtDescription,
        due_date: dueDate || null
      });

      toast.success("Debt recorded successfully!");
      setShowAddModal(false);
      resetForm();
      fetchDebts();
    } catch (error) {
      console.error("Error adding debt:", error);
      toast.error(error.response?.data?.message || "Failed to record debt");
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    try {
      await debtAPI.recordPayment({
        debtId: selectedDebt.id,
        amount: parseFloat(paymentAmount),
        notes: paymentNotes
      });

      toast.success("Payment recorded successfully!");
      setShowPaymentModal(false);
      resetPaymentForm();
      fetchDebts();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setDebtAmount("");
    setDebtDescription("");
    setDueDate("");
  };

  const resetPaymentForm = () => {
    setSelectedDebt(null);
    setPaymentAmount("");
    setPaymentNotes("");
  };

  const viewPaymentHistory = async (debt) => {
    setSelectedDebt(debt);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    
    try {
      const res = await debtAPI.getPayments(debt.id);
      setPaymentHistory(res.data || []);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      toast.error("Failed to load payment history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
  };

  const totals = useMemo(() => {
    return debts.reduce((sum, d) => {
      const amount = parseFloat(d.amount) || 0;
      const paid = parseFloat(d.payment_amount) || 0;
      return sum + (amount - paid);
    }, 0);
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
      {/* Add Debt Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
        >
          <Plus size={20} />
          Record New Debt
        </button>
      </div>

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
                        <p className="font-medium text-white">{debt.customer_name || debt.customer || "Unknown Customer"}</p>
                        <p className="text-sm text-zinc-500 flex items-center gap-1">
                          <Clock size={14} />
                          {formatDate(debt.created_at)}
                        </p>
                        {debt.description && (
                          <p className="text-xs text-zinc-600 mt-1">{debt.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">
                        {formatCurrency((parseFloat(debt.amount) || 0) - (parseFloat(debt.payment_amount) || 0))}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Total: {formatCurrency(debt.amount)}
                      </p>
                      {debt.payment_amount > 0 && (
                        <p className="text-xs text-emerald-400">
                          Paid: {formatCurrency(debt.payment_amount)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-lg ${
                          daysOverdue > 30 
                            ? "bg-red-500/20 text-red-400" 
                            : daysOverdue > 7 
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-zinc-700 text-zinc-400"
                        }`}>
                          {daysOverdue > 0 ? `${daysOverdue} days` : "Recent"}
                        </span>
                        <button
                          onClick={() => viewPaymentHistory(debt)}
                          className="text-xs px-2 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                        >
                          History
                        </button>
                        {(debt.status === 'pending' || debt.status === 'partial') && (
                          <button
                            onClick={() => {
                              setSelectedDebt(debt);
                              setShowPaymentModal(true);
                            }}
                            className="text-xs px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                          >
                            Pay
                          </button>
                        )}
                      </div>
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

      {/* Add Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Record New Debt</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-4">
              {/* Customer Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  <User size={14} className="inline mr-1" />
                  Customer *
                </label>
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setSelectedCustomer(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                {customerSearch && !selectedCustomer && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg">
                    {filteredCustomers.slice(0, 5).map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full px-4 py-2 text-left hover:bg-zinc-700 text-white text-sm"
                      >
                        {customer.name}
                        {customer.phone && <span className="text-zinc-500 ml-2">({customer.phone})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  <DollarSign size={14} className="inline mr-1" />
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="0.00"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  <Calendar size={14} className="inline mr-1" />
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  <FileText size={14} className="inline mr-1" />
                  Description
                </label>
                <textarea
                  value={debtDescription}
                  onChange={(e) => setDebtDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="What is this debt for?"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  Record Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Record Payment</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  resetPaymentForm();
                }}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Customer</p>
              <p className="text-white font-medium">{selectedDebt.customer_name || selectedDebt.customer}</p>
              <p className="text-sm text-zinc-400 mt-2">Outstanding Amount</p>
              <p className="text-white font-medium">{formatCurrency((parseFloat(selectedDebt.amount) || 0) - (parseFloat(selectedDebt.payment_amount) || 0))}</p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  <DollarSign size={14} className="inline mr-1" />
                  Payment Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={parseFloat(selectedDebt.amount) - parseFloat(selectedDebt.payment_amount || 0)}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Payment notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    resetPaymentForm();
                  }}
                  className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showHistoryModal && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Payment History</h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedDebt(null);
                  setPaymentHistory([]);
                }}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-400">Customer</p>
              <p className="text-white font-medium">{selectedDebt.customer_name || selectedDebt.customer}</p>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-xs text-zinc-500">Total Debt</p>
                  <p className="text-white">{formatCurrency(selectedDebt.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Paid</p>
                  <p className="text-emerald-400">{formatCurrency(selectedDebt.payment_amount || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Balance</p>
                  <p className="text-amber-400">{formatCurrency((parseFloat(selectedDebt.amount) || 0) - (parseFloat(selectedDebt.payment_amount) || 0))}</p>
                </div>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
              </div>
            ) : paymentHistory.length > 0 ? (
              <div className="space-y-3">
                {paymentHistory.map((payment, index) => (
                  <div key={payment.id} className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Payment #{paymentHistory.length - index}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(payment.payment_date).toLocaleString()}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-zinc-400 mt-1">{payment.notes}</p>
                        )}
                      </div>
                      <p className="text-emerald-400 font-medium">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-500">No payments recorded yet</p>
              </div>
            )}

            <button
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedDebt(null);
                setPaymentHistory([]);
              }}
              className="w-full mt-4 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
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
