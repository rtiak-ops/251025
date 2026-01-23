import type { AxiosResponse } from "axios";
import { api, saveToken } from "./client";
import type { User, AuthToken } from "../types";

/**
 * ユーザー登録
 */
export const register = async (
  email: string,
  password: string,
  full_name?: string
): Promise<User> => {
  try {
    const res: AxiosResponse<User> = await api.post("/auth/register", {
      email,
      password,
      full_name,
    });
    return res.data;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

/**
 * ログイン
 */
export const login = async (
  email: string,
  password: string
): Promise<AuthToken> => {
  try {
    const res: AxiosResponse<AuthToken> = await api.post("/auth/login", {
      email,
      password,
    });
    saveToken(res.data.access_token);
    return res.data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

/**
 * ユーザー検索
 */
export const searchUsers = async (email: string): Promise<User[]> => {
  const res = await api.get("/auth/users", { params: { email } });
  return res.data;
};

/**
 * 自分の情報を取得
 */
export const getMe = async (): Promise<User> => {
  const res = await api.get("/auth/me");
  return res.data;
};

/**
 * 全ユーザー取得 (管理者用)
 */
export const getUsers = async (): Promise<User[]> => {
  const res = await api.get("/admin/users");
  return res.data;
};

/**
 * ユーザー権限の更新 (管理者用)
 */
export const updateUserRole = async (userId: number, role: string): Promise<User> => {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data;
};

/**
 * ユーザー削除 (管理者用)
 */
export const deleteUser = async (userId: number): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
};

/**
 * ユーザーを組織に招待/割当
 */
export const assignUserToOrganization = async (email: string): Promise<User> => {
    const res = await api.post("/admin/users/assign", { email });
    return res.data;
};
