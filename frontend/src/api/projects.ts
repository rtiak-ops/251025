import type { AxiosResponse } from "axios";
import { api } from "./client";
import type { Project, ProjectSummary, CreateProjectData, UpdateProjectData, Collaborator } from "../types";

/**
 * プロジェクト一覧取得
 */
export const getProjects = async (): Promise<Project[]> => {
  const res: AxiosResponse<Project[]> = await api.get("/projects/");
  return res.data;
};

/**
 * プロジェクト概要取得
 */
export const getProjectSummaries = async (): Promise<ProjectSummary[]> => {
  const res: AxiosResponse<ProjectSummary[]> = await api.get("/projects/summary");
  return res.data;
};

/**
 * プロジェクト作成
 */
export const createProject = async (data: CreateProjectData): Promise<Project> => {
  const res: AxiosResponse<Project> = await api.post("/projects/", data);
  return res.data;
};

/**
 * プロジェクト更新
 */
export const updateProject = async (id: number, data: UpdateProjectData): Promise<Project> => {
  const res: AxiosResponse<Project> = await api.patch(`/projects/${id}`, data);
  return res.data;
};

/**
 * プロジェクト削除
 */
export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`/projects/${id}`);
};

/**
 * コラボレーター追加
 */
export const addCollaborator = async (projectId: number, userId: number, permission: string = "editor"): Promise<Collaborator> => {
  const res = await api.post(`/projects/${projectId}/collaborators`, { user_id: userId, permission });
  return res.data;
};

/**
 * コラボレーター削除
 */
export const removeCollaborator = async (projectId: number, userId: number): Promise<void> => {
  await api.delete(`/projects/${projectId}/collaborators/${userId}`);
};
