import { api } from "./client";
import type { Organization, CreateOrganizationData, UpdateOrganizationData } from "../types";

/**
 * 所属組織の情報を取得
 */
export const getMyOrganization = async (): Promise<Organization> => {
  const res = await api.get("/organizations/me");
  return res.data;
};

/**
 * 新しい組織を作成
 */
export const createOrganization = async (data: CreateOrganizationData): Promise<Organization> => {
  const res = await api.post("/organizations/", data);
  return res.data;
};
/**
 * 組織情報を更新
 */
export const updateOrganization = async (data: UpdateOrganizationData): Promise<Organization> => {
  const res = await api.patch("/organizations/me", data);
  return res.data;
};

/**
 * 組織を削除
 */
export const deleteOrganization = async (): Promise<void> => {
  await api.delete("/organizations/me");
};

/**
 * 組織から退会
 */
export const leaveOrganization = async (): Promise<void> => {
  await api.post("/organizations/leave");
};
