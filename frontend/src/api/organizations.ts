import { api } from "./client";
import type { Organization, CreateOrganizationData } from "../types";

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
