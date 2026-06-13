import { FormEvent, useState } from "react";
import { KeyRound, LogIn, Shuffle } from "lucide-react";
import { setWorkspaceId, suggestWorkspaceId, validateWorkspaceId } from "../lib/workspace";

type WorkspaceLoginPageProps = {
  onLogin: (workspaceId: string) => void;
};

export function WorkspaceLoginPage({ onLogin }: WorkspaceLoginPageProps) {
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const validationError = validateWorkspaceId(workspaceInput);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const workspaceId = setWorkspaceId(workspaceInput);
      onLogin(workspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enter workspace");
    }
  }

  function fillSuggestedWorkspace() {
    setWorkspaceInput(suggestWorkspaceId());
    setError("");
  }

  return (
    <main className="login-shell">
      <section className="card login-card">
        <div className="login-logo">TZ</div>
        <div className="login-copy">
          <p className="small-label">Trade Zone MVP</p>
          <h1>Enter your workspace</h1>
          <p>
            ใส่ชื่อ workspace ที่คุณจำได้เองก่อน ระบบจะใช้ค่านี้แทน userId ชั่วคราว
            เพื่อแยก watchlist, rule และ Telegram setting ของแต่ละคน
          </p>
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <form onSubmit={submit} className="login-form">
          <label>
            Workspace ID
            <div className="input-with-icon">
              <KeyRound size={16} />
              <input
                autoFocus
                value={workspaceInput}
                placeholder="เช่น patsakon-main-8x29"
                onChange={(event) => setWorkspaceInput(event.target.value)}
              />
            </div>
          </label>

          <div className="button-row login-actions">
            <button className="btn" type="button" onClick={fillSuggestedWorkspace}>
              <Shuffle size={16} /> Generate
            </button>
            <button className="btn primary" type="submit">
              <LogIn size={16} /> Enter App
            </button>
          </div>
        </form>

        <div className="helper-box">
          <b>จำ workspace นี้ไว้</b>
          <p>
            นี่ไม่ใช่ระบบ login จริง ใครรู้ workspace ID ก็เปิดข้อมูลชุดนั้นได้
            ดังนั้นควรตั้งให้เดายากหน่อย แล้วค่อยทำ auth จริงทีหลัง
          </p>
        </div>
      </section>
    </main>
  );
}
