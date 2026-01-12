import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserRole } from "../api";
import { Users, Shield, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import type { User } from "../types";

/**
 * ユーザー管理画面
 * 管理者が全ユーザーのリストを確認し、権限（ロール）を変更するための画面です。
 */
export default function UserManagementView({ currentUser }: { currentUser?: User }) {
    const queryClient = useQueryClient();

    // ユーザー一覧の取得
    const { data: users, isLoading, isError } = useQuery<User[]>({
        queryKey: ["admin-users"],
        queryFn: async () => {
            const data = await getUsers();
            return Array.isArray(data) ? data : [];
        },
    });

    const adminCount = Array.isArray(users) ? users.filter(u => u.role === 'admin').length : 0;

    // 権限更新のミューテーション
    const mutation = useMutation({
        mutationFn: ({ userId, role }: { userId: number; role: string }) => 
            updateUserRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success("ユーザー権限を更新しました");
        },
        onError: (err: any) => {
            const message = err.response?.data?.detail || "権限の更新に失敗しました";
            toast.error(message);
        }
    });

    const handleRoleChange = (userId: number, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        
        // 自分自身を降格させようとしている場合の警告
        if (currentUser && currentUser.id === userId && newRole === 'user') {
            if (!window.confirm("警告: あなた自身を管理者から外そうとしています。実行すると管理画面にアクセスできなくなりますが、よろしいですか？")) {
                return;
            }
        } else {
            if (!window.confirm(`このユーザーの権限を ${newRole} に変更しますか？`)) {
                return;
            }
        }

        mutation.mutate({ userId, role: newRole });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center glass rounded-3xl border border-red-100 dark:border-red-900/30">
                <p className="text-red-500 font-bold">ユーザーリストを読み込めませんでした</p>
                <p className="text-sm text-slate-500 mt-2">管理者権限が必要です。</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <Users className="text-indigo-600" /> ユーザー管理
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        システム利用者の権限設定とアカウント管理を行います。
                    </p>
                </div>
            </div>

            <div className="glass rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-white/5 text-slate-500 dark:text-slate-300 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">ユーザー</th>
                            <th className="p-4">権限 status</th>
                            <th className="p-4">登録日</th>
                            <th className="p-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {Array.isArray(users) && users.map((user) => user && (
                            <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                            <UserIcon size={16} />
                                        </div>
                                        <div>
                                            <div className="font-medium dark:text-white">{user.email}</div>
                                            <div className="text-[10px] text-slate-400">ID: {user.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 w-fit ${
                                        user.role === 'admin' 
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                        {user.role === 'admin' ? <Shield size={10} /> : null}
                                        {user.role?.toUpperCase() || 'USER'}
                                    </span>
                                    {currentUser && currentUser.id === user.id && (
                                        <span className="ml-2 text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                                            YOU
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-sm text-slate-500">
                                    {user.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP') : '-'}
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleRoleChange(user.id, user.role)}
                                        disabled={mutation.isPending || (user.role === 'admin' && adminCount <= 1)}
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={user.role === 'admin' && adminCount <= 1 ? "最後の管理者は変更できません" : ""}
                                    >
                                        {user.role === 'admin' ? '一般へ変更' : '管理者へ昇格'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                <span className="text-xl">💡</span>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    <strong>実務的なポイント:</strong> この画面では「誰が誰の権限を変えたか」がすべて監査ログに記録されます。<br />
                    不用意な管理者の増殖を防ぐため、権限変更は慎重に行ってください。
                </p>
            </div>
        </div>
    );
}
