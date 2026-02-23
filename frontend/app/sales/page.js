"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { salesAPI, inventoryAPI, customerAPI } from "@/services/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  Receipt, Loader2, ShoppingCart, User, DollarSign, 
  Plus, Minus, Trash2, Search, Store, Building2, Download, Clock
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

function SalesContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("new-sale");
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [searchProduct, setSearchProduct] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [saleType, setSaleType] = useState("retail");
  const [lastReceipt, setLastReceipt] = useState(null);
  const [lastSaleId, setLastSaleId] = useState(null);
  
  const [form, setForm] = useState({
    selectedCustomer: null,
    customerName: "",
    paid: "",
    sendEmail: false,
    customerEmail: ""
  });
  
  const [cart, setCart] = useState([]);

  // Load sales history
  const loadSales = async () => {
    setSalesLoading(true);
    try {
      const res = await salesAPI.getAll();
      setSales(res.data || []);
    } catch (error) {
      console.error("Error loading sales:", error);
    } finally {
      setSalesLoading(false);
    }
  };

  // Load sales when switching to history tab
  useEffect(() => {
    if (activeTab === "history") {
      loadSales();
    }
  }, [activeTab]);

  // Download receipt function
  const handleDownloadReceipt = async (saleId) => {
    try {
      setDownloadingId(saleId);
      const response = await salesAPI.getReceipt(saleId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${saleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt");
    } finally {
      setDownloadingId(null);
    }
  };

  // Format date
  const formatDate = (date) => 
    new Date(date).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

  // Calculate totals for history
  const totals = useMemo(() => {
    return sales.reduce((acc, s) => ({
      total: acc.total + (parseFloat(s.total) || 0),
      paid: acc.paid + (parseFloat(s.paid) || 0),
    }), { total: 0, paid: 0 });
  }, [sales]);

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

  // Filter available inventory based on sale type
  const availableProducts = useMemo(() => {
    let items = inventory.filter(i => {
      if (saleType === 'retail') {
        return (i.retail_quantity || 0) > 0;
      } else {
        return (i.wholesale_quantity || 0) > 0;
      }
    });
    if (searchProduct) {
      items = items.filter(i => 
        i.product.toLowerCase().includes(searchProduct.toLowerCase())
      );
    }
    return items;
  }, [inventory, searchProduct, saleType]);

  // Get price based on sale type
  const getPrice = (product) => {
    if (saleType === 'retail') {
      return parseFloat(product.retail_price || product.selling_price || 0);
    } else {
      return parseFloat(product.wholesale_price || product.selling_price || 0);
    }
  };

  // Get available stock based on sale type
  const getAvailableStock = (product) => {
    if (saleType === 'retail') {
      return product.retail_quantity || 0;
    } else {
      return product.wholesale_quantity || 0;
    }
  };

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
    const availableStock = getAvailableStock(product);
    
    if (existingItem) {
      if (existingItem.quantity < availableStock) {
        setCart(cart.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast.error(`Not enough ${saleType} stock available`);
      }
    } else {
      setCart([...cart, {
        productId: product.id,
        product: product.product,
        quantity: 1,
        unitPrice: getPrice(product),
        availableStock: availableStock
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
      toast.error(`Not enough ${saleType} stock available`);
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
        customerEmail: form.customerEmail,
        sale_type: saleType
      };

      const res = await salesAPI.createSale(saleData);
      
      if (res.data.receipt) {
        setLastReceipt(res.data.receipt);
        setLastSaleId(res.data.receiptNumber);
      }
      
      toast.success(`${saleType === 'retail' ? 'Retail' : 'Wholesale'} sale recorded successfully!`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record sale");
    } finally {
      setLoading(false);
    }
  };

  // Download receipt PDF
  const downloadReceipt = () => {
    if (!lastReceipt) return;
    
    const link = document.createElement('a');
    link.href = lastReceipt;
    link.download = `receipt-${lastSaleId || 'sale'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Start new sale (clear receipt and cart)
  const startNewSale = () => {
    setLastReceipt(null);
    setLastSaleId(null);
    setCart([]);
    setForm({
      selectedCustomer: null,
      customerName: "",
      paid: "",
      sendEmail: false,
      customerEmail: ""
    });
  };

  const balance = Math.max(0, cartTotal - (parseFloat(form.paid) || 0));

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <ShoppingCart className="text-indigo-400" size={24} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">Sales</h1>
          <p className="text-sm text-zinc-500">Manage sales and transactions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('new-sale')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'new-sale' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Plus size={18} />
          New Sale
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Clock size={18} />
          Transaction History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'new-sale' ? (
        <>
          {/* Receipt Download Success Message */}
          {lastReceipt && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Receipt className="text-emerald-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Sale Recorded Successfully!</h2>
                    <p className="text-sm text-zinc-400">Receipt #{lastSaleId} is ready for download</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={downloadReceipt}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors"
                  >
                    <Download size={18} />
                    Download Receipt
                  </button>
                  <button
                    onClick={startNewSale}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
                  >
                    <Plus size={18} />
                    New Sale
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sale Type Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSaleType('retail');
                setCart([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                saleType === 'retail' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Store size={18} />
              Retail Sale
            </button>
            <button
              onClick={() => {
                setSaleType('wholesale');
                setCart([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                saleType === 'wholesale' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 size={18} />
              Wholesale Sale
            </button>
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
                    placeholder={`Search ${saleType} products...`}
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
                            <p className="text-sm text-zinc-500">
                              Stock: {getAvailableStock(product)} ({saleType})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${saleType === 'retail' ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {formatCurrency(getPrice(product))}
                            </p>
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
                <div className={`text-sm font-medium mb-3 px-3 py-2 rounded-lg ${
                  saleType === 'retail' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {saleType === 'retail' ? 'Retail Sale' : 'Wholesale Sale'}
                </div>
                
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
                {lastReceipt ? (
                  <div className="text-center py-4 text-zinc-400">
                    <p>Sale complete! Use the buttons above to download receipt or start a new sale.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || cart.length === 0}
                    className={`w-full py-4 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      saleType === 'retail' ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Receipt size={20} />
                        Complete {saleType === 'retail' ? 'Retail' : 'Wholesale'} Sale - {formatCurrency(cartTotal)}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Transaction History Tab */}
          {/* Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <p className="text-sm text-zinc-500">Total Sales</p>
              <p className="text-2xl font-bold text-white">{sales.length}</p>
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
                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        <Loader2 size={32} className="mx-auto animate-spin" />
                      </td>
                    </tr>
                  ) : sales.length > 0 ? (
                    sales.map((sale, idx) => {
                      const debt = (parseFloat(sale.total) || 0) - (parseFloat(sale.paid) || 0);
                      return (
                        <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="p-4">
                            <p className="text-white font-medium">{sale.customer || "Walk-in Customer"}</p>
                            <p className="text-xs text-zinc-500">Receipt #{sale.receipt_number || sale.id}</p>
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
                          <td className="p-4">
                            <button
                              onClick={() => handleDownloadReceipt(sale.id)}
                              disabled={downloadingId === sale.id}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {downloadingId === sale.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                              Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No sales found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Sales() {
  return (
    <ProtectedRoute>
      <SalesContent />
    </ProtectedRoute>
  );
}
