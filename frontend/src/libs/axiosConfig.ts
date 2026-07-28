import axios from "axios";
import type {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

type TokenProvider = () => Promise<string | null>;

type UnauthorizedHandler = (info: { hadToken: boolean }) => void;

type TaggedConfig = InternalAxiosRequestConfig & { hadToken?: boolean };

let tokenProvider: TokenProvider = async () => null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE}`,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config: TaggedConfig) => {
  const token = await tokenProvider();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.hadToken = Boolean(config.headers.Authorization);
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler({
        hadToken: Boolean((error.config as TaggedConfig)?.hadToken),
      });
    }

    const backendMessage = (error.response?.data as { message?: string })
      ?.message;
    const message =
      backendMessage ??
      (error.code === "ECONNABORTED"
        ? "Request timed out"
        : error.message || "Network error");

    return Promise.reject(new Error(message));
  },
);
