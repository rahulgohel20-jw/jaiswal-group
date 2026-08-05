import axios from "axios";
import { toast } from "sonner";

let activeRequests = 0;

const updateLoader = (delta, config) => {
  if (!config || config.skipGlobalLoader) return;

  // Only show the global backdrop loader for mutating requests (POST, PUT, DELETE).
  // Background GET requests should not block the user interface.
  const method = config.method?.toUpperCase();
  if (method === 'GET' && !config.showGlobalLoader) return;

  activeRequests += delta;
  if (activeRequests < 0) activeRequests = 0;

  console.log(`[axiosInstance] activeRequests: ${activeRequests}, delta: ${delta}, url: ${config.url}`);

  if (typeof window !== 'undefined') {
    if (activeRequests === 1 && delta > 0) {
      console.log("[axiosInstance] Dispatching show-global-loader event");
      window.dispatchEvent(new CustomEvent("show-global-loader"));
    } else if (activeRequests === 0 && delta < 0) {
      console.log("[axiosInstance] Dispatching hide-global-loader event");
      window.dispatchEvent(new CustomEvent("hide-global-loader"));
    }
  }
};


const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 1800000,
});

axiosInstance.interceptors.request.use((config) => {
  updateLoader(1, config);
  if (config.url?.includes("/v1/api/auth/login")) {
    const systemToken = localStorage.getItem("token");
    config.headers["x-am-authorization"] = systemToken || "__token__";
  } else {
    const userToken = localStorage.getItem("userToken");

    if (userToken) {
      // ✅ Logged-in users: their own userToken
      config.headers["Authorization"] = `Bearer ${userToken}`;
    } else {
      // ✅ Share page users: the owner's userToken passed via URL → sessionStorage
      const shareToken = sessionStorage.getItem("shareToken");
      if (shareToken) {
        config.headers["Authorization"] = `Bearer ${shareToken}`;
      }
    }

    const systemToken = localStorage.getItem("token");
    config.headers["x-am-authorization"] = systemToken || "__token__";
  }

  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  } else {
    delete config.headers["Content-Type"];
  }

  return config;
}, (error) => {
  updateLoader(-1, error?.config);
  return Promise.reject(error);
});

export const getNewToken = async () => {
  try {
    const response = await fetch(
      "http://172.105.39.203:38246/api/system-api/admin/token?=null",
      {
        method: "POST",
        headers: {
          "x-am-response-case": "noChange",
          "x-am-response-object-type": "no_action",
          "x-am-meta": "false",
          "x-am-secret": "685e86fde0b506ce98e9f399",
          "x-am-internationalization": "DEFAULT",
          "x-am-run-in-sandbox": "0",
          "x-am-content-type-response": "application/json",
          "x-am-cache-control": "no_action",
          "x-am-get-encrypted-data": "no_encryption",
          "x-am-sandbox-timeout": "13000",
          "x-no-compression": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authTokenType: "AM",
          authTokenAM: {
            u: "default",
            p: "default",
          },
        }),
      },
    );

    const data = await response.json();
    localStorage.setItem("token", data.data.token);
    return data.data.token;
  } catch (error) {
    console.error("Failed to get new token", error);
    throw error;
  }
};

axiosInstance.interceptors.response.use(
  (response) => {
    updateLoader(-1, response.config);
    const method = response.config?.method?.toUpperCase();
    const skipToast = response.config?.skipGlobalToast;
    if (method && method !== 'GET' && !skipToast) {
      const msg = response.data?.message || response.data?.msg || "Operation completed successfully.";
      toast.success(msg);
    }
    return response;
  },
  async (error) => {
    updateLoader(-1, error.config);
    const originalRequest = error.config;
    const isSharePage = window.location.pathname.includes("/menu-share");

    const isUnauthorized =
      error.response?.status === 401 &&
      error.response?.data?.errors?.[0]?.message?.includes(
        "Authorization header 'x-am-authorization' is not valid",
      );

    const willRetry = isUnauthorized && !originalRequest?._retry;

    if (error.config && !error.config.skipGlobalToast && !willRetry) {
      const isAuthPath = error.config.url?.includes("/auth/login") || error.config.url?.includes("/system-api/admin/token");
      if (!isAuthPath) {
        const msg = error.response?.data?.message || error.response?.data?.msg || error.message || "An error occurred.";
        toast.error(msg);
      }
    }

    if (isUnauthorized && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await getNewToken();
        originalRequest.headers["x-am-authorization"] = newToken;
        return axiosInstance(originalRequest);
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        localStorage.removeItem("userId");

        if (!isSharePage) {
          window.location.href = "/auth/login"; // ← skip for share users
        }
        return Promise.reject(err);
      }
    }

    if (
      error.response?.status === 401 &&
      originalRequest?.url?.includes("/v1/api/auth/") &&
      !isSharePage // ← skip for share users
    ) {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("userId");
      window.location.href = "/auth/login";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

// === Helpers ===
export const POST = (url, data) => axiosInstance.post(url, data);
export const GET = (url, params) => axiosInstance.get(url, { params });
export const PUT = (url, data, params) => axiosInstance.put(url, data, { params });
export const DELETE = (url, params) => axiosInstance.delete(url, { params });
export const UPLOAD = (url, formData, config = {}) =>
  axiosInstance.post(url, formData, config);

export default axiosInstance;
