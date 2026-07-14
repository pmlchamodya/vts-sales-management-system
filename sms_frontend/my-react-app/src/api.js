import axios from "axios";

const api = axios.create({
  //baseURL: "http://127.0.0.1:8000/api", // Your live Laravel API
  baseURL: "https://wday.lk/vts_sales_backend/api", // Your local Laravel API
  headers: {
    Accept: "application/json",
  },
  withCredentials: false,
});

// Attach token and handle dynamic Content-Type
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    // Add Bearer Token if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // IMPORTANT: Let the browser set the multipart boundary automatically for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else {
      // Default JSON requests
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Global 401 (Unauthorized) handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("Token expired or invalid. Redirecting to login...");
      localStorage.removeItem("token");

      // Redirect to login using Hash URL to support HashRouter
      window.location.hash = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
