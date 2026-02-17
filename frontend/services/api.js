import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://smartbiz-sl-oy4l.onrender.com",
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
};

// ==================== SALES ====================
export const salesAPI = {
  quickSale: (data) => API.post("/api/sales/quick", data),
  getAll: () => API.get("/api/sales/all"),
};

// ==================== INVENTORY ====================
export const inventoryAPI = {
  supplierOrder: (data) => API.post("/api/inventory/supplier-order", data),
  getAll: () => {
    if (typeof window !== "undefined") {
      const data = localStorage.getItem("inventory");
      return Promise.resolve({ data: data ? JSON.parse(data) : [] });
    }
    return Promise.resolve({ data: [] });
  },
  save: (items) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("inventory", JSON.stringify(items));
    }
    return Promise.resolve({ data: { message: "Saved" } });
  },
};

// ==================== DEBT ====================
export const debtAPI = {
  getAll: () => API.get("/api/debt/all"),
};

// ==================== AI ====================
export const aiAPI = {
  ask: (question) => API.get("/api/ai/ask", { params: { question } }),
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
};

// Default export for backward compatibility
export const api = {
  auth: authAPI,
  sales: salesAPI,
  inventory: inventoryAPI,
  debt: debtAPI,
  ai: aiAPI,
  platform: platformAPI,
  subscription: subscriptionAPI,
};

export default API;
