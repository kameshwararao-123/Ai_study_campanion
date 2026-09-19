import axios from "axios";

/**
 * Resolves the backend API base URL from Vite environment variables.
 * Prioritizes:
 * 1. VITE_API_URL (e.g., "http://localhost:5000/api" or "https://my-backend.com/api")
 * 2. VITE_API_BASE_URL (alternative alias)
 * 3. VITE_BACKEND_URL (e.g., "http://localhost:5000" -> automatically appends "/api")
 * 4. Fallback: "/api" (which routes cleanly via Vite proxy in dev or reverse proxy in prod)
 */
function resolveApiBaseUrl() {
  const envApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl && typeof envApiUrl === "string" && envApiUrl.trim()) {
    return envApiUrl.trim().replace(/\/+$/, "");
  }

  const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
  if (envBackendUrl && typeof envBackendUrl === "string" && envBackendUrl.trim()) {
    const cleaned = envBackendUrl.trim().replace(/\/+$/, "");
    return cleaned.endsWith("/api") ? cleaned : `${cleaned}/api`;
  }

  return "/api";
}

export const API_BASE_URL = resolveApiBaseUrl();
export const BACKEND_ROOT_URL = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL.slice(0, -4)
  : API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — token expired or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Avoid redirect loop on the login page itself
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
