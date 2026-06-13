import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import { Badge } from "../components/Badge";

type ImportSummary = {
  fileName: string;
  size: number;
  rows: number;
  buyRows: number;
  sellRows: number;
  feeRows: number;
  assets: string[];
  note: string;
};

export function ImportPage() {
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    setSummary(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await api.post<{ summary: ImportSummary }>("/api/import/binance-th", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSummary(response.data.summary);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="content-grid">
        <div className="card panel">
          <div className="panel-head"><h3>Import Binance TH History</h3><Badge tone="yellow">MVP mock parser</Badge></div>
          <label className="upload-zone">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
            <UploadCloud size={42} />
            <b>{busy ? "Uploading..." : "เลือกไฟล์ history trade"}</b>
            <span>รองรับแนวคิด Excel / CSV จาก Binance TH, parser จริงทำใน phase ถัดไป</span>
          </label>
          {error ? <div className="alert error">{error}</div> : null}
        </div>

        <div className="card panel">
          <div className="panel-head"><h3>Import Summary</h3></div>
          {summary ? (
            <div className="summary-list">
              <div><span>File</span><b>{summary.fileName}</b></div>
              <div><span>Rows</span><b>{summary.rows}</b></div>
              <div><span>Buy</span><b>{summary.buyRows}</b></div>
              <div><span>Sell</span><b>{summary.sellRows}</b></div>
              <div><span>Assets</span><b>{summary.assets.join(", ")}</b></div>
              <p className="muted">{summary.note}</p>
            </div>
          ) : <p className="muted">ยังไม่มีไฟล์ที่ import</p>}
        </div>
      </section>
    </div>
  );
}
