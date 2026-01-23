import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserRole, deleteUser } from "../../api";
import { Users } from "lucide-react";
import { toast } from "react-hot-toast";
import type { User } from "../../types";
import UserCard from "../users/UserCard";

interface UserManagementViewProps {
  currentUser?: User;
}

/**
 * 組織内の全ユーザーを管理するビュー。
 * 権限の変更やユーザーの削除（退会処理）などを行います。
 */
export default function UserManagementView({ currentUser }: UserManagementViewProps) {
  const queryClient = useQueryClient();

  // ユーザー一覧の取得
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  // ロール変更のミューテーション
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number, role: User['role'] }) => updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("ユーザー権限を更新しました");
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  // ユーザー削除のミューテーション
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("ユーザーを削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const handleRoleChange = (userId: number, currentRole: User['role']) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`権限を ${newRole} に変更しますか？`)) return;
    roleMutation.mutate({ userId, role: newRole });
  };

  const handleDelete = (userId: number) => {
    if (userId === currentUser?.id) {
      toast.error("自分自身を削除することはできません");
      return;
    }
    if (!window.confirm("本当にこのユーザーを削除しますか？この操作は取り消せません。")) return;
    deleteMutation.mutate(userId);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Users className="text-indigo-600" size={32} />
          ユーザー管理
        </h2>
      </div>

      <div className="glass p-8 rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
            ))
          ) : Array.isArray(users) && users.map((user) => (
            <UserCard 
              key={user.id} 
              user={user} 
              isCurrentUser={user.id === currentUser?.id}
              onRoleChange={handleRoleChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
