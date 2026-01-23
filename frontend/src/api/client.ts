import axios from "axios";

// 接続先のサーバーURL (ベースURL)
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const TOKEN_KEY = "auth_token";

// Axiosのインスタンス
export const api = axios.create({ baseURL: API_BASE });

// リクエストの前処理: トークンをヘッダーに自動付与
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// トークン管理の便利関数
export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const clearToken = (tokenToClear?: string) => { 
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (tokenToClear && currentToken !== tokenToClear) return;
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("auth:unauthorized"));
}

export const saveToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);

export default api;
