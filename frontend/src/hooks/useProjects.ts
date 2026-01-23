import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { getProjectSummaries, updateProject, deleteProject } from "../api";
import type { ProjectSummary } from "../types";

export function useProjects(token: string | null) {
  const { data: projectsData } = useQuery<ProjectSummary[]>({
    queryKey: ["projects"],
    queryFn: getProjectSummaries,
    enabled: !!token,
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];

  const handleEditProject = async (projectId: number, currentProject: ProjectSummary, onDataChange: () => void) => {
    const newName = window.prompt("プロジェクト名を変更:", currentProject.name);
    if (newName === null) return;
    const newDesc = window.prompt("プロジェクトの説明を変更:", currentProject.description || "");
    if (newDesc === null) return;

    try {
      await updateProject(projectId, { name: newName, description: newDesc });
      toast.success("プロジェクトを更新しました");
      onDataChange();
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleDeleteProject = async (projectId: number, projectName: string, onSuccess: () => void) => {
    if (!window.confirm(`プロジェクト「${projectName}」を削除しますか？`)) return;

    try {
      await deleteProject(projectId);
      toast.success("プロジェクトを削除しました");
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
