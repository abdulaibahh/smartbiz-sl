"use client";

import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { inventoryAPI } from "@/services/api";
import { Package, Search, Plus, Minus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

function InventoryContent() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ product: "", quantity: 1 });

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
      await inventoryAPI.supplierOrder({
        product: newItem.product,
        quantity: parseInt(newItem.quantity) || 1
      });
      toast.success("Product added to inventory!");
      loadInventory();
    } catch (error) {
      toast.error("Failed to add product");
    }
    setNewItem({ product: "", quantity: 1 });
    setShowModal(false);
  };

  const handleUpdateQuantity = async (id, delta) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    const newQuantity = Math.max(0, item.quantity + delta);
    
    try {
      await inventoryAPI.updateQuantity(id, newQuantity);
      setInventory(prev => prev.map(i => 
        i.id === id ? { ...i, quantity: newQuantity } : i
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

  const filtered = useMemo(() => {
    if (!search) return inventory;
    return inventory.filter(i => 
      i.product.toLowerCase().includes(search.toLowerCase())
    );
  }, [inventory, search]);

  const totalItems = inventory.reduce((sum, i) => sum + i.quantity, 0);

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
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-zinc-500">{inventory.length} products, {totalItems} total units</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Search products..."
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
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Package className="text-purple-400" size={24} />
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-1">{item.product}</h3>
              <p className="text-3xl font-bold text-indigo-400 mb-4">{item.quantity}</p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateQuantity(item.id, -1)}
                  className="flex-1 p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center"
                >
                  <Minus size={18} />
                </button>
                <button
                  onClick={() => handleUpdateQuantity(item.id, 1)}
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
          <p className="text-zinc-500">No products in inventory</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Add your first product
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Add Product</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Product Name</label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={newItem.product}
                  onChange={(e) => setNewItem({ ...newItem, product: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Initial Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
                >
                  Add Product
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
