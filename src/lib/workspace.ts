const WORKSPACE_KEY = "trade_zone_workspace_id";

export const workspaceIdPattern = /^[a-zA-Z0-9_-]{4,80}$/;

export function normalizeWorkspaceId(value: string): string {
  return value.trim();
}

export function validateWorkspaceId(value: string): string | null {
  const normalized = normalizeWorkspaceId(value);
  if (!normalized) return "Please enter your workspace ID";
  if (!workspaceIdPattern.test(normalized)) {
    return "Workspace ID must be 4-80 characters and use only A-Z, a-z, 0-9, _ or -";
  }
  return null;
}

export function getStoredWorkspaceId(): string | null {
  const existing = localStorage.getItem(WORKSPACE_KEY);
  if (!existing) return null;

  const normalized = normalizeWorkspaceId(existing);
  if (!workspaceIdPattern.test(normalized)) {
    localStorage.removeItem(WORKSPACE_KEY);
    return null;
  }

  if (normalized !== existing) {
    localStorage.setItem(WORKSPACE_KEY, normalized);
  }

  return normalized;
}

export function getWorkspaceId(): string {
  const existing = getStoredWorkspaceId();
  if (!existing) {
    throw new Error("Workspace is not selected. Please enter your workspace ID first.");
  }
  return existing;
}

export function setWorkspaceId(value: string): string {
  const normalized = normalizeWorkspaceId(value);
  const error = validateWorkspaceId(normalized);
  if (error) throw new Error(error);

  localStorage.setItem(WORKSPACE_KEY, normalized);
  window.dispatchEvent(new Event("workspace-changed"));
  return normalized;
}

export function clearWorkspaceId(): void {
  localStorage.removeItem(WORKSPACE_KEY);
  window.dispatchEvent(new Event("workspace-changed"));
}

export function suggestWorkspaceId(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `workspace-${suffix}`;
}
