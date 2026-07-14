import axios from "axios";

// Define the base URL for the backend API
const API_BASE_URL = "https://wday.lk/vts_sales_backend/api"; // ✅ Your live Laravel API URL

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json", // Expect JSON responses from the server
  },
});

// Request Interceptor: Runs before every API request is sent
api.interceptors.request.use(
  (config) => {
    // Retrieve the authentication token from local or session storage
    const token =
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    // If a token exists, attach it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If the data being sent is FormData (e.g., file uploads),
    // remove the default Content-Type header so the browser can automatically set it with the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error), // Handle request errors
);

// Response Interceptor: Runs after every API response is received
api.interceptors.response.use(
  (response) => response, // Return the response if it's successful
  (error) => {
    // If the server returns a 401 Unauthorized error (token expired or invalid)
    if (error.response?.status === 401) {
      // Remove stored tokens to clear the invalid session
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");
      // Redirect the user to the login page
      window.location.href = "/login";
    }
    return Promise.reject(error); // Reject the promise so the calling function can catch the error
  },
);

// Supplier Service object containing all API call methods related to suppliers
export const supplierService = {
  // Fetch a list of all suppliers
  getAll: () => api.get("/suppliers"),

  // Fetch details of a single supplier by their ID
  get: (id) => api.get(`/suppliers/${id}`),

  // Create a new supplier
  create: (data) => {
    // If data contains files (FormData), send as is (the interceptor will handle headers)
    if (data instanceof FormData) {
      return api.post("/suppliers", data);
    }
    // Otherwise, explicitly set Content-Type to JSON for standard text data
    return api.post("/suppliers", data, {
      headers: { "Content-Type": "application/json" },
    });
  },

  // Update an existing supplier by their ID
  update: (id, data) => {
    // Laravel requires a workaround for PUT requests that include FormData (file uploads).
    // We send a POST request but append '_method=PUT' to the payload.
    if (data instanceof FormData) {
      data.append("_method", "PUT");
      return api.post(`/suppliers/${id}`, data);
    }
    // Standard JSON update using a PUT request
    return api.put(`/suppliers/${id}`, data);
  },

  // Delete a supplier by their ID
  delete: (id) => api.delete(`/suppliers/${id}`),

  // Search for suppliers using a specific search query
  search: (query) => api.get(`/suppliers/search/${query}`),

  // ✅ Check if a specific supplier code already exists in the database
  checkCode: (code) => api.get(`/suppliers/check-code/${code}`), // Should return { exists: true/false }
};
