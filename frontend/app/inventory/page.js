"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/providers/LanguageContext";
import { useAuth } from "@/providers/AuthContext";
import { inventoryAPI } from "@/services/api";
import { Package, Search, Plus, Minus, Trash2, DollarSign, Edit2, X, Store, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/currency";

function InventoryContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockType, setStockType] = useState("retail"); // 'retail' or 'wholesale'
  const [newItem, setNewItem] = useState({ 
    product: "", 
    quantity: "", 
    cost_price: "", 
    retail_price: "",
    wholesale_price: ""
  });
  const [editForm, setEditForm] = useState({ 
    product: "", 
    retail_quantity: "", 
    wholesale_quantity: "",
    cost_price: "", 
    retail_price: "",
    wholesale_price: ""
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const res = await inventoryAPI.getAll();
      setInventory(res.data || []);
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.product.trim()) return;

    try {
      const data = {
        product: newItem.product,
        quantity: parseInt(newItem.quantity) || 1,
        cost_price: parseFloat(newItem.cost_price) || 0,
        retail_price: parseFloat(newItem.retail_price) || 0,
        wholesale_price: parseFloat(newItem.wholesale_price) || 0,
        stock_type: stockType
      };
      
      await inventoryAPI.supplierOrder(data);
      toast.success("Product added to inventory!");
      loadInventory();
    } catch (error) {
      toast.error("Failed to add product");
    }
    setNewItem({ product: "", quantity: "", cost_price: "", retail_price: "", wholesale_price: "" });
    setShowModal(false);
  };

  const handleAddRetailStock = async (product, quantity) => {
    try {
      await inventoryAPI.addRetail({
        product: product.product,
        quantity: parseInt(quantity) || 1,
        cost_price: product.cost_price || 0,
        retail_price: product.retail_price || 0
      });
      toast.success("Retail stock added!");
      loadInventory();
    } catch (error) {
      toast.error("Failed to add retail stock");
    }
  };

  const handleAddWholesaleStock = async (product, quantity) => {
    try {
      await inventoryAPI.addWholesale({
        product: product.product,
        quantity: parseInt(quantity) || 1,
        cost_price: product.cost_price || 0,
        wholesale_price: product.wholesale_price || 0
      });
      toast.success("Wholesale stock added!");
      loadInventory();
    } catch (error) {
      toast.error("Failed to add wholesale stock");
    }
  };

  const handleUpdateQuantity = async (id, delta, type) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    const currentQty = type === 'retail' ? item.retail_quantity : item.wholesale_quantity;
    const newQuantity = Math.max(0, (currentQty || 0) + delta);
    
    try {
      const updateData = type === 'retail' 
        ? { retail_quantity: newQuantity }
        : { wholesale_quantity: newQuantity };
      
      await inventoryAPI.updateQuantity(id, updateData);
      setInventory(prev => prev.map(i => 
        i.id === id ? { ...i, [type === 'retail' ? 'retail_quantity' : 'wholesale_quantity']: newQuantity } : i
      ));
    } catch (error) {
      toast.error("Failed to update quantity");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    
    try {
      await inventoryAPI.deleteItem(id);
      setInventory(prev => prev.filter(i => i.id !== id));
      toast.success("Product deleted");
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      product: item.product,
      retail_quantity: item.retail_quantity || 0,
      wholesale_quantity: item.wholesale_quantity || 0,
      cost_price: item.cost_price || "",
      retail_price: item.retail_price || "",
      wholesale_price: item.wholesale_price || ""
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await inventoryAPI.supplierOrder({
        id: editingItem.id,
        product: editForm.product,
        quantity: (parseInt(editForm.retail_quantity) || 0) + (parseInt(editForm.wholesale_quantity) || 0),
        cost_price: parseFloat(editForm.cost_price) || 0,
        retail_price: parseFloat(editForm.retail_price) || 0,
        wholesale_price: parseFloat(editForm.wholesale_price) || 0,
        stock_type: 'both'
      });
      toast.success("Product updated!");
      loadInventory();
    } catch (error) {
      toast.error("Failed to update product");
    }
    setShowEditModal(false);
    setEditingItem(null);
  };

  const filtered = useMemo(() => {
    if (!search) return inventory;
    return inventory.filter(i => 
      i.product.toLowerCase().includes(search.toLowerCase())
    );
  }, [inventory, search]);

  const totalRetailItems = inventory.reduce((sum, i) => sum + (i.retail_quantity || 0), 0);
  const totalWholesaleItems = inventory.reduce((sum, i) => sum + (i.wholesale_quantity || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('inventory.title')}</h1>
          <p className="text-zinc-500">
            {inventory.length} {t('inventory.products')} | 
            <span className="text-emerald-400 ml-2">{t('inventory.retailStock')}: {totalRetailItems}</span> | 
            <span className="text-blue-400 ml-2">{t('inventory.wholesaleStock')}: {totalWholesaleItems}</span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
        >
          <Plus size={20} />
          {t('inventory.addProduct')}
        </button>
      </div>

      {/* Stock Type Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setStockType('retail')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            stockType === 'retail' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Store size={18} />
          {t('inventory.retailStock')}
        </button>
        <button
          onClick={() => setStockType('wholesale')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            stockType === 'wholesale' 
              ? 'bg-blue-600 text-white' 
              : 'bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Building2 size={18} />
          {t('inventory.wholesaleStock')}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder={t('inventory.searchProducts')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Inventory Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  stockType === 'retail' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                }`}>
                  <Package className={stockType === 'retail' ? 'text-emerald-400' : 'text-blue-400'} size={24} />
                </div>
                {isOwner && (
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-1">{item.product}</h3>
              
              {/* Stock Display */}
              <div className="mb-3 space-y-1">
                <div className={`text-2xl font-bold ${stockType === 'retail' ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {stockType === 'retail' ? (item.retail_quantity || 0) : (item.wholesale_quantity || 0)}
                </div>
                <div className="flex gap-3 text-xs text-zinc-500">
                  <span>{t('inventory.retailStock')}: {item.retail_quantity || 0}</span>
                  <span>{t('inventory.wholesaleStock')}: {item.wholesale_quantity || 0}</span>
                </div>
              </div>
              
              {/* Price Display - Only show to owners */}
              {isOwner && (item.cost_price > 0) && (
                <div className="text-sm text-zinc-400 mb-3 space-y-1">
                  <p>{t('inventory.costPrice')}: {formatCurrency(item.cost_price)}</p>
                </div>
              )}
              {(item.retail_price > 0 || item.wholesale_price > 0) && (
                <div className="text-sm text-zinc-400 mb-3 space-y-1">
                  {item.retail_price > 0 && (
                    <p className="text-green-400">{t('inventory.retailPrice')}: {formatCurrency(item.retail_price)}</p>
                  )}
                  {item.wholesale_price > 0 && (
                    <p className="text-blue-400">{t('inventory.wholesalePrice')}: {formatCurrency(item.wholesale_price)}</p>
                  )}
                </div>
              )}
              
              {/* Quick Add Stock Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAddRetailStock(item, 1)}
                  className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs flex items-center justify-center gap-1"
                >
                  <Plus size={14} />
                  {t('inventory.addRetail')}
                </button>
                <button
                  onClick={() => handleAddWholesaleStock(item, 1)}
                  className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs flex items-center justify-center gap-1"
                >
                  <Plus size={14} />
                  {t('inventory.addWholesale')}
                </button>
              </div>
              
              {/* Quantity Controls */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => handleUpdateQuantity(item.id, -1, stockType)}
                  className="flex-1 p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center"
                >
                  <Minus size={18} />
                </button>
                <button
                  onClick={() => handleUpdateQuantity(item.id, 1, stockType)}
                  className="flex-1 p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <Package size={48} className="mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-500">{t('inventory.noProducts')}</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {t('inventory.addFirstProduct')}
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">{t('inventory.addProduct')}</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.productName')}</label>
                <input
                  type="text"
                  placeholder={t('inventory.productName')}
                  value={newItem.product}
                  onChange={(e) => setNewItem({ ...newItem, product: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.initialQuantity')}</label>
                <input
                  type="number"
                  min="0"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              {isOwner && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.costPrice')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.cost_price}
                  onChange={(e) => setNewItem({ ...newItem, cost_price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.retailPrice')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.retail_price}
                  onChange={(e) => setNewItem({ ...newItem, retail_price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.wholesalePrice')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.wholesale_price}
                  onChange={(e) => setNewItem({ ...newItem, wholesale_price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
                >
                  {t('inventory.addProduct')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">{t('inventory.editProduct')}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.productName')}</label>
                <input
                  type="text"
                  placeholder={t('inventory.productName')}
                  value={editForm.product}
                  onChange={(e) => setEditForm({ ...editForm, product: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.retailQuantity')}</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.retail_quantity}
                    onChange={(e) => setEditForm({ ...editForm, retail_quantity: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.wholesaleQuantity')}</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.wholesale_quantity}
                    onChange={(e) => setEditForm({ ...editForm, wholesale_quantity: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              {isOwner && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.costPrice')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={editForm.cost_price}
                  onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.retailPrice')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={editForm.retail_price}
                  onChange={(e) => setEditForm({ ...editForm, retail_price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('inventory.wholesalePrice')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={editForm.wholesale_price}
                  onChange={(e) => setEditForm({ ...editForm, wholesale_price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
                >
                  {t('inventory.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Inventory() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  );
}
