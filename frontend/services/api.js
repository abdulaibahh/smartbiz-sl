import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  login: (credentials) => API.post("/api/auth/login", credentials),
  register: (data) => API.post("/api/auth/register", data),
  getUsers: () => API.get("/api/auth/users"),
  createUser: (data) => API.post("/api/auth/users", data),
  deleteUser: (id) => API.delete(`/api/auth/users/${id}`),
};

// ==================== BUSINESS ====================
export const businessAPI = {
  get: () => API.get("/api/business"),
  update: (data) => API.put("/api/business", data),
  uploadLogo: (logo) => API.post("/api/business/logo", { logo }),
};

// ==================== SALES ====================
export const salesAPI = {
  quickSale: (data) => API.post("/api/sales/quick", data),
  createSale: (data) => API.post("/api/sales/sale", data),
  getAll: () => API.get("/api/sales/all"),
  getReceipt: (id) => API.get(`/api/sales/receipt/${id}`, { responseType: 'blob' }),
};

// ==================== INVENTORY ====================
export const inventoryAPI = {
  supplierOrder: (data) => API.post("/api/inventory/supplier-order", data),
  getAll: () => API.get("/api/inventory/all"),
  updateQuantity: (id, data) => API.put(`/api/inventory/${id}`, typeof data === 'number' ? { quantity: data } : data),
  deleteItem: (id) => API.delete(`/api/inventory/${id}`),
};

// ==================== CUSTOMERS ====================
export const customerAPI = {
  getAll: () => API.get("/api/customers/all"),
  getById: (id) => API.get(`/api/customers/${id}`),
  create: (data) => API.post("/api/customers", data),
  update: (id, data) => API.put(`/api/customers/${id}`, data),
  delete: (id) => API.delete(`/api/customers/${id}`),
  getHistory: (id) => API.get(`/api/customers/${id}/history`),
};

// ==================== DEBT ====================
export const debtAPI = {
  getAll: () => API.get("/api/debt/all"),
};

// ==================== AI ====================
export const aiAPI = {
  ask: (question) => API.get("/api/ai/ask", { params: { question } }),
  getSummary: () => API.get("/api/ai/summary"),
  getInsights: (type) => API.get("/api/ai/insights", { params: { type } }),
};

// ==================== PLATFORM ====================
export const platformAPI = {
  login: (credentials) => API.post("/api/platform/login", credentials),
  getStats: () => API.get("/api/platform/stats"),
  getBusinesses: () => API.get("/api/platform/businesses"),
  getRevenue: () => API.get("/api/platform/revenue"),
};

// ==================== SUBSCRIPTION ====================
export const subscriptionAPI = {
  getStatus: () => API.get("/api/subscription/status"),
  createCheckout: (plan) => API.post("/api/subscription/checkout", { plan }),
  submitOrangePayment: (data) => API.post("/api/subscription/orange-payment", data),
};

// Default export for backward compatibility
export const api = {
  auth: authAPI,
  business: businessAPI,
  sales: salesAPI,
  inventory: inventoryAPI,
  debt: debtAPI,
  ai: aiAPI,
  platform: platformAPI,
  subscription: subscriptionAPI,
};

export default API;
