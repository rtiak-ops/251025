import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserRole, deleteUser } from "../../api";
import { Users } from "lucide-react";
import { toast } from "react-hot-toast";
import type { User } from "../../types";
import UserCard from "../users/UserCard";
import axios from "axios";

interface UserManagementViewProps {
  currentUser?: User;
}

/**
 * 【ユーザー管理ビュー (UserManagementView)】
 * 組織の管理者が、所属するメンバーを一覧表示し、権限の変更やアカウントの削除を行うための画面です。
 * 適切な権限管理を行い、組織の統制を維持することを目的としています。
 */
export default function UserManagementView({ currentUser }: UserManagementViewProps) {
  const queryClient = useQueryClient();

  // --- データの取得 ---
  // 所属組織のユーザーリストを取得。React Queryで管理。
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  // --- 権限更新 (ロール変更) のアクション ---
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number, role: User['role'] }) => updateUserRole(userId, role),
    onSuccess: () => {
      // 成功したらリストを再取得（キャッシュの無効化）
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("ユーザー権限を更新しました");
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  // --- ユーザー削除のアクション ---
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("ユーザーを削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  /**
   * 権限（admin / user）をトグル（切り替え）するハンドラー
   */
  const handleRoleChange = (userId: number, currentRole: User['role']) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    // 誤操作防止の確認ダイアログ
    if (!window.confirm(`権限を ${newRole} に変更しますか？`)) return;
    roleMutation.mutate({ userId, role: newRole });
  };

  /**
   * 特定のユーザーを組織から削除する（退会させる）ハンドラー
   */
  const handleDelete = (userId: number) => {
    // 自分自身の削除（管理者ゼロ問題の防止にも繋がる）をフロントエンドで防止
    if (userId === currentUser?.id) {
      toast.error("自分自身を削除することはできません");
      return;
    }
    if (!window.confirm("本当にこのユーザーを削除しますか？この操作は取り消せません。")) return;
    deleteMutation.mutate(userId);
  };

  // 組織未登録エラー（400）の判定
  const usersError = queryClient.getQueryState(["users"])?.error;
  const isNoOrgError = axios.isAxiosError(usersError) && usersError.response?.status === 400;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Users className="text-indigo-600" size={32} />
          ユーザー管理
        </h2>
      </div>

      <div className="glass p-8 rounded-3xl">
        {isLoading ? (
          // ローディング中のプレースホルダー
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : isNoOrgError ? (
          <div className="py-20 text-center space-y-4">
            <div className="text-5xl">🏢</div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-white">組織が登録されていません</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              ユーザー管理機能を使用するには、先に組織を作成する必要があります。<br/>
              サイドバーの上部にある「組織を作成」から登録を行ってください。
            </p>
          </div>
        ) : Array.isArray(users) && users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                isCurrentUser={user.id === currentUser?.id} 
                onRoleChange={handleRoleChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              表示できるユーザーがいません。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
