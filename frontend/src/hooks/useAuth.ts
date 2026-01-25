import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { getStoredToken, clearToken, getMe, getMyOrganization } from "../api";
import type { User, Organization } from "../types";

/**
 * 【認証管理フック (useAuth)】
 * アプリケーション全体の認証状態（トークン）、ログイン中のユーザー情報、
 * および所属組織の情報を一元管理するフックです。
 */
export function useAuth() {
  const queryClient = useQueryClient();
  
  // ブラウザのストレージから初期トークンを取得して状態として保持
  const [token, setToken] = useState<string | null>(getStoredToken());

  // --- ログインユーザー自身の情報の取得 ---
  // トークンが存在する場合のみ実行されます（enabled: !!token）
  const { data: currentUser } = useQuery<User>({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: !!token,
  });

  // --- ユーザーが所属する組織情報の取得 ---
  // ユーザー情報が取得でき、かつ組織IDを持っている場合のみ実行されます
  const { data: organization } = useQuery<Organization>({
    queryKey: ["organization"],
    queryFn: getMyOrganization,
    enabled: !!token && !!currentUser?.organization_id,
  });

  /**
   * API通信で 401 Unauthorized エラーが発生した際のイベント処理を登録。
   * セッション切れなどでトークンが無効になった場合に、フロント側でも自動でログアウト状態にします。
   */
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      queryClient.clear(); // React Queryのキャッシュも全てクリア
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [queryClient]);

  /**
   * ログアウト処理
   * ストレージのトークンを削除し、アプリの状態を初期化します。
   */
  const handleLogout = () => {
    clearToken();
    setToken(null);
    queryClient.clear();
    toast.success("ログアウトしました");
  };

  return {
    // 状態
    token,
    setToken,
    currentUser,
    organization,
    
    // 操作
    handleLogout
  };
}
