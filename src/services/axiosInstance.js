import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 1800000,
});

axiosInstance.interceptors.request.use((config) => {
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
}, (error) => Promise.reject(error));

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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isSharePage = window.location.pathname.includes("/menu-share");

    const isUnauthorized =
      error.response?.status === 401 &&
      error.response?.data?.errors?.[0]?.message?.includes(
        "Authorization header 'x-am-authorization' is not valid",
      );

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
      originalRequest.url?.includes("/v1/api/auth/") &&
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
export const PUT = (url, data) => axiosInstance.put(url, data);
export const DELETE = (url, data, params) =>
  axiosInstance.delete(url, data, { params });

export const UPLOAD = (url, formData, config = {}) =>
  axiosInstance.post(url, formData, config);

export default axiosInstance;
