import type { AxiosResponse } from "axios";
import { api } from "./client";
import type { AuditLog, HealthStatus, SystemStats } from "../types";

/**
 * 監査ログ取得
 */
export const getAuditLogs = async (
    skip: number = 0, 
    limit: number = 100,
    filters: any = {}
): Promise<AuditLog[]> => {
    const res: AxiosResponse<AuditLog[]> = await api.get("/admin/audit-logs", {
        params: { skip, limit, ...filters }
    });
    return res.data;
};

/**
 * システムのヘルス状態取得
 */
export const getHealth = async (): Promise<HealthStatus> => {
    const res = await api.get("/monitor/health");
    return res.data;
};

/**
 * システムメトリクス取得
 */
export const getSystemMetrics = async (): Promise<SystemStats> => {
    const res = await api.get("/monitor/stats");
    return res.data;
};
