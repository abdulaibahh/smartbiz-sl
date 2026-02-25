import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
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

// Handle auth errors and network errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      // Determine more specific error message
      let errorMessage = "Network Error: Unable to connect to server";
      
      if (error.message) {
        // Check for common error patterns
        if (error.message.includes("Network Error") || error.message.includes("net::ERR")) {
          errorMessage = "Cannot connect to server. Please check that the backend is running on port 5000.";
        } else if (error.message.includes("timeout") || error.code === "ECONNABORTED") {
          errorMessage = "Request timeout - the server took too long to respond. Please try again.";
        } else if (error.message.includes("CORS")) {
          errorMessage = "CORS error - the server is not allowing cross-origin requests.";
        } else {
          errorMessage = "Network Error: " + error.message;
        }
      }
      
      console.error(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
    
    // Handle auth errors
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
  deleteAccount: () => API.delete("/api/auth/account"),
  forgotPassword: (email) => API.post("/api/auth/forgot-password", { email }),
  resetPassword: (data) => API.post("/api/auth/reset-password", data),
};

// ==================== BUSINESS ====================
export const businessAPI = {
  get: () => API.get("/api/business"),
  update: (data) => API.put("/api/business", data),
  uploadLogo: (logo) => API.post("/api/business/logo", { logo }),
  deleteAccount: () => API.delete("/api/business/account"),
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
  addRetail: (data) => API.post("/api/inventory/retail", data),
  addWholesale: (data) => API.post("/api/inventory/wholesale", data),
  getAll: () => API.get("/api/inventory/all"),
  updateQuantity: (id, data) => API.put(`/api/inventory/${id}`, typeof data === 'number' ? { retail_quantity: data } : data),
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
  create: (data) => API.post("/api/debt", data),
  recordPayment: (data) => API.post("/api/debt/payment", data),
  getPayments: (debtId) => API.get(`/api/debt/payments/${debtId}`),
  getSummary: () => API.get("/api/debt/summary"),
};

// ==================== AI ====================
export const aiAPI = {
  ask: (question) => API.post("/api/ai/ask", { question }),
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
  getPayments: () => API.get("/api/subscription/payments"),
};

// ==================== ORDERS ====================
export const ordersAPI = {
  getAll: () => API.get("/api/orders/all"),
  getById: (id) => API.get(`/api/orders/${id}`),
  create: (data) => API.post("/api/orders", data),
  receive: (id, items) => API.put(`/api/orders/${id}/receive`, { items }),
  delete: (id) => API.delete(`/api/orders/${id}`),
  getPayments: (orderId) => API.get(`/api/orders/${orderId}/payments`),
  recordPayment: (orderId, data) => API.post(`/api/orders/${orderId}/payment`, data),
};

// ==================== DATABASE ====================
export const dbAPI = {
  executeQuery: (sql) => API.post("/api/db/query", { sql }),
  getTables: () => API.get("/api/db/tables"),
  getSchema: (table) => API.get(`/api/db/schema/${table}`),
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
  orders: ordersAPI,
};

export default API;
