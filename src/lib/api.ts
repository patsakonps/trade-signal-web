import axios from "axios";
import { env } from "../config/env";
import { getWorkspaceId } from "./workspace";

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers["X-Workspace-Id"] = getWorkspaceId();
  return config;
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message || error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}
