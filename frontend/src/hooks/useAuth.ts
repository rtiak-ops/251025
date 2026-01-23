import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { getStoredToken, clearToken, getMe, getMyOrganization } from "../api";
import type { User, Organization } from "../types";

export function useAuth() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(getStoredToken());

  // 自分自身のユーザー情報
  const { data: currentUser } = useQuery<User>({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: !!token,
  });

  // 自分自身の所属組織
  const { data: organization } = useQuery<Organization>({
    queryKey: ["organization"],
    queryFn: getMyOrganization,
    enabled: !!token && !!currentUser?.organization_id,
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      queryClient.clear();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [queryClient]);

  const handleLogout = () => {
    clearToken();
    setToken(null);
    queryClient.clear();
    toast.success("ログアウトしました");
  };

  return {
    token,
    setToken,
    currentUser,
    organization,
    handleLogout
  };
}
