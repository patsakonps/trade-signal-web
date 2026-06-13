const WORKSPACE_KEY = "trade_zone_workspace_id";

function createWorkspaceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `workspace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getWorkspaceId(): string {
  const existing = localStorage.getItem(WORKSPACE_KEY);
  if (existing) return existing;
  const next = createWorkspaceId();
  localStorage.setItem(WORKSPACE_KEY, next);
  return next;
}

export function resetWorkspace(): string {
  const next = createWorkspaceId();
  localStorage.setItem(WORKSPACE_KEY, next);
  return next;
}
