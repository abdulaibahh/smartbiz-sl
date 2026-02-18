"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { subscriptionAPI } from "@/services/api";
import toast from "react-hot-toast";
import { CreditCard, Check, Sparkles, Loader2, Calendar, Shield, Smartphone, Phone } from "lucide-react";

function SubscriptionContent() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showOrangeModal, setShowOrangeModal] = useState(false);
  const [orangeForm, setOrangeForm] = useState({
    transactionId: "",
    senderNumber: "",
    amount: 10
  });
  const [submittingOrange, setSubmittingOrange] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await subscriptionAPI.getStatus();
        setStatus(res.data);
      } catch (error) {
        // Demo mode - simulate active subscription
        setStatus({ active: true, trialEnds: null, nextBilling: new Date(Date.now() + 30*24*60*60*1000) });
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleCheckout = async (plan) => {
    setCheckoutLoading(true);
    try {
      const res = await subscriptionAPI.createCheckout(plan);
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.success("Demo mode: Checkout would redirect to Stripe");
      }
    } catch (error) {
      toast.error("Checkout not available in demo mode");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOrangePayment = async (e) => {
    e.preventDefault();
    setSubmittingOrange(true);
    
    try {
      const res = await subscriptionAPI.submitOrangePayment(orangeForm);
      toast.success(res.data?.message || "Payment submitted!");
      setShowOrangeModal(false);
      setOrangeForm({ transactionId: "", senderNumber: "", amount: 10 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmittingOrange(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', day: 'numeric', year: 'numeric' 
    });
  };

  const plans = [
    {
      name: "Pro",
      price: 10,
      period: "month",
      features: [
        "Unlimited sales records",
        "AI Business Insights",
        "Debt Tracking",
        "Inventory Management",
        "PDF Receipts via Email",
        "Priority Support"
      ],
      popular: true
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <CreditCard className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Current Plan</h2>
              <p className="text-zinc-500">
                {status?.active ? (
                  <span className="text-emerald-400">Active Subscription</span>
                ) : (
                  <span className="text-amber-400">Trial Period</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">$10<span className="text-lg text-zinc-500 font-normal">/mo</span></p>
            <p className="text-sm text-zinc-500">Pro Plan</p>
          </div>
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <Calendar className="text-zinc-500" size={20} />
            <div>
              <p className="text-xs text-zinc-500">Next Billing</p>
              <p className="text-white font-medium">{status?.nextBilling ? formatDate(status.nextBilling) : "N/A"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="text-zinc-500" size={20} />
            <div>
              <p className="text-xs text-zinc-500">Trial Ends</p>
              <p className="text-white font-medium">{status?.trialEnds ? formatDate(status.trialEnds) : "N/A"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Check className="text-emerald-400" size={20} />
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <p className="text-emerald-400 font-medium">{status?.active ? "Active" : "Inactive"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Subscribe - $10/month</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credit Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="text-blue-400" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-white">Credit/Debit Card</h4>
                <p className="text-sm text-zinc-500">Pay with Visa or Mastercard</p>
              </div>
            </div>
            <button
              onClick={() => handleCheckout("pro")}
              disabled={checkoutLoading || status?.active}
              className="w-full py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-500"
            >
              {checkoutLoading ? (
                <Loader2 size={20} className="animate-spin mx-auto" />
              ) : status?.active ? (
                "Current Plan"
              ) : (
                "Pay with Card"
              )}
            </button>
          </div>

          {/* Orange Money */}
          <div className="bg-zinc-900/80 border border-orange-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Smartphone className="text-orange-400" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-white">Orange Money</h4>
                <p className="text-sm text-zinc-500">Send to +232 75 756 395</p>
              </div>
            </div>
            <button
              onClick={() => setShowOrangeModal(true)}
              disabled={status?.active}
              className="w-full py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-orange-600 text-white hover:bg-orange-500"
            >
              {status?.active ? (
                "Current Plan"
              ) : (
                "Pay with Orange Money"
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <h4 className="font-medium text-white mb-2 flex items-center gap-2">
            <Phone size={16} className="text-zinc-400" />
            How to Pay with Orange Money
          </h4>
          <ol className="text-sm text-zinc-400 space-y-1 list-decimal list-inside">
            <li>Open your Orange Money app</li>
            <li>Send <strong className="text-white">$10</strong> (or Le 225,000) to <strong className="text-white">+232 75 756 395</strong></li>
            <li>Enter the transaction ID in the form above</li>
            <li>We'll verify and activate your subscription</li>
          </ol>
        </div>
      </div>

      {/* Orange Money Modal */}
      {showOrangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Orange Money Payment</h2>
            
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <p className="text-orange-400 font-medium mb-2">Send exactly $10 to:</p>
              <p className="text-2xl font-bold text-white">+232 75 756 395</p>
              <p className="text-sm text-zinc-400 mt-2">Or Le 225,000</p>
            </div>

            <form onSubmit={handleOrangePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Your Orange Money Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., +232 76 123456"
                  value={orangeForm.senderNumber}
                  onChange={(e) => setOrangeForm({ ...orangeForm, senderNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Transaction ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., OM123456789"
                  value={orangeForm.transactionId}
                  onChange={(e) => setOrangeForm({ ...orangeForm, transactionId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Amount Sent ($)</label>
                <input
                  type="number"
                  required
                  min="10"
                  value={orangeForm.amount}
                  onChange={(e) => setOrangeForm({ ...orangeForm, amount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOrangeModal(false)}
                  className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrange}
                  className="flex-1 py-3 rounded-xl bg-orange-600 text-white hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingOrange ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Subscription() {
  return (
    <ProtectedRoute>
      <SubscriptionContent />
    </ProtectedRoute>
  );
}
