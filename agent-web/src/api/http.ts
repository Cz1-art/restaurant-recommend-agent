import { formatApiError } from "./errors";

﻿const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail: unknown
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const detail = (errorBody as { detail?: unknown }).detail;
    const message = formatApiError(
      detail,
      (errorBody as { message?: string }).message || response.statusText
    );
    throw new ApiError(message || "请求失败", response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface IntegrationStatus {
  dify: { configured: boolean; cloud_ok: boolean; message: string };
  amap: { configured: boolean; hint: string };
  fix_dify: string;
  fix_amap: string;
  dify_fallback_on_error?: boolean;
}

export async function fetchIntegrationStatus(): Promise<IntegrationStatus> {
  return apiRequest("/api/v1/integration/status");
}

export async function fetchHealth(): Promise<{ status: string }> {
  return apiRequest("/health");
}
