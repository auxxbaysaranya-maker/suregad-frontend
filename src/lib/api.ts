import axios from "axios";
import { API_BASE } from "./config";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || "Request failed.";
    const code = error.response?.data?.error?.code || "REQUEST_FAILED";
    return Promise.reject(Object.assign(new Error(message), { code, details: error.response?.data?.error?.details, status: error.response?.status }));
  },
);

export type ApiError = Error & { code?: string; details?: unknown; status?: number };
