"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { salesAPI, inventoryAPI, customerAPI } from "@/services/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  Receipt, Loader2, ShoppingCart, User, DollarSign, 
  Plus, Minus, Trash2, Search, Package, X
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

function SalesContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  const [form, setForm] = useState({
    selectedCustomer: null,
    customerName: "",
    sendEmail: false,
    customerEmail: ""
  });
  
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invRes, custRes] = await Promise.all([
        inventoryAPI.getAll().catch(() => ({ data: [] })),
        customerAPI.getAll().catch(() => ({ data: [] }))
      ]);
      setInventory(invRes.data || []);
      setCustomers(custRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Filter available inventory (items with stock)
  const availableProducts = useMemo(() => {
    let items = inventory.filter(i => i.quantity > 0);
    if (searchProduct) {
      items = items.filter(i => 
        i.product.toLowerCase().includes(searchProduct.toLowerCase())
      );
    }
    return items;
  }, [inventory, searchProduct]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!searchCustomer) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchCustomer.toLowerCase())
    );
  }, [customers, searchCustomer]);

  // Add item to cart
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.quantity) {
        setCart(cart.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast.error("Not enough stock available");
      }
    } else {
      setCart([...cart, {
        productId: product.id,
        product: product.product,
        quantity: 1,
        unitPrice: product.selling_price || 0,
        availableStock: product.quantity
      }]);
    }
    setSearchProduct("");
  };

  // Update cart item quantity
  const updateCartQuantity = (productId, delta) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      removeFromCart(productId);
    } else if (newQty <= item.availableStock) {
      setCart(cart.map(i => 
        i.productId === productId ? { ...i, quantity: newQty } : i
      ));
    } else {
      toast.error("Not enough stock available");
    }
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Calculate totals
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [cart]);

  // Handle customer selection
  const selectCustomer = (customer) => {
    setForm({
      ...form,
      selectedCustomer: customer,
      customerName: customer.name,
      customerEmail: customer.email || ""
    });
    setSearchCustomer("");
    setShowCustomerDropdown(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error("Please add items to cart");
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        paid: form.paid || cartTotal,
        customer: form.customerName || "Walk-in Customer",
        customerId: form.selectedCustomer?.id,
        sendEmail: form.sendEmail,
        customerEmail: form.customerEmail
      };

      const res = await salesAPI.createSale(saleData);

      toast.success("Sale recorded successfully!");
      
      // Reset form
      setCart([]);
      setForm({
        selectedCustomer: null,
        customerName: "",
        paid: "",
        sendEmail: false,
        customerEmail: ""
      });
      
      setTimeout(() => {
        router.push("/sales/history");
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record sale");
    } finally {
      setLoading(false);
    }
  };

  const balance = Math.max(0, cartTotal - (parseFloat(form.paid) || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <ShoppingCart className="text-indigo-400" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">New Sale</h1>
          <p className="text-sm text-zinc-500">Select items from inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search Products */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            
            {/* Product List */}
            {searchProduct && (
              <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
                {availableProducts.length > 0 ? (
                  availableProducts.slice(0, 8).map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div>
                        <p className="text-white font-medium">{product.product}</p>
                        <p className="text-sm text-zinc-500">Stock: {product.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-medium">{formatCurrency(product.selling_price || 0)}</p>
                        <p className="text-xs text-zinc-500">per unit</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-zinc-500 text-center py-4">No products found</p>
                )}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Cart ({cart.length} items)</h3>
            
            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.product}</p>
                      <p className="text-sm text-zinc-500">{formatCurrency(item.unitPrice)} each</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(item.productId, -1)}
                          className="p-1 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, 1)}
                          className="p-1 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <p className="text-white font-medium w-24 text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                <p>No items in cart</p>
                <p className="text-sm">Search and add products above</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Summary & Payment */}
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Customer</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search or enter customer..."
                value={form.customerName}
                onChange={(e) => {
                  setForm({ ...form, customerName: e.target.value, selectedCustomer: null });
                  setSearchCustomer(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500"
              />
            </div>
            
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-zinc-800 border border-zinc-700">
                {filteredCustomers.slice(0, 5).map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className="w-full p-2 text-left hover:bg-zinc-700 text-white"
                  >
                    {customer.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Payment</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Amount Paid</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.paid}
                    onChange={(e) => setForm({ ...form, paid: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500"
                  />
                </div>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-3 border-t border-zinc-700">
                <span>Balance Due</span>
                <span className={balance > 0 ? "text-amber-400" : "text-emerald-400"}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>

            {/* Email Receipt */}
            <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sendEmail}
                  onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-600 text-indigo-600"
                />
                <span className="text-sm text-zinc-300">Send receipt via email</span>
              </label>
              {form.sendEmail && (
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  className="w-full mt-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm"
                />
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || cart.length === 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Receipt size={20} />
                  Complete Sale - {formatCurrency(cartTotal)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  return (
    <ProtectedRoute>
      <SalesContent />
    </ProtectedRoute>
  );
}            <Receipt className="text-indigo-400" size={24} />
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
