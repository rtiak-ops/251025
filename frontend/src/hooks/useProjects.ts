import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { getProjectSummaries, updateProject, deleteProject } from "../api";
import type { ProjectSummary } from "../types";

/**
 * 【プロジェクト管理フック (useProjects)】
 * ログインユーザーがアクセス可能なプロジェクト一覧の取得、
 * およびプロジェクト名の編集や削除といった操作を管理します。
 */
export function useProjects(token: string | null) {
  // --- プロジェクト一覧の取得 ---
  const { data: projectsData } = useQuery<ProjectSummary[]>({
    queryKey: ["projects"],
    queryFn: getProjectSummaries,
    enabled: !!token, // ログイン中のみフェッチ
  });

  // 取得したデータが配列であることを保証（初期値やエラー時の安全策）
  const projects = Array.isArray(projectsData) ? projectsData : [];

  /**
   * プロジェクトの編集（名前・説明）
   * ブラウザのプロンプトを使用して簡易的に入力を受け取り、APIを呼び出します。
   */
  const handleEditProject = async (projectId: number, currentProject: ProjectSummary, onDataChange: () => void) => {
    const newName = window.prompt("プロジェクト名を変更:", currentProject.name);
    if (newName === null) return; // キャンセルされた場合
    
    const newDesc = window.prompt("プロジェクトの説明を変更:", currentProject.description || "");
    if (newDesc === null) return;

    try {
      await updateProject(projectId, { name: newName, description: newDesc });
      toast.success("プロジェクトを更新しました");
      // 成功後にキャッシュの更新を親側に通知
      onDataChange();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  /**
   * プロジェクトの削除
   * 誤操作防止の確認ダイアログを表示してから実行します。
   */
  const handleDeleteProject = async (projectId: number, projectName: string, onSuccess: () => void) => {
    if (!window.confirm(`プロジェクト「${projectName}」を削除しますか？`)) return;

    try {
      await deleteProject(projectId);
      toast.success("プロジェクトを削除しました");
      // 削除後の画面遷移などを実行するためにコールバックを呼び出し
      onSuccess();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return {
    projects,
    handleEditProject,
    handleDeleteProject
  };
}
