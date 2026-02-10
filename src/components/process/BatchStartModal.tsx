import { useState, useRef } from "react";
// 🟢 Change import from 'startProcess' to 'batchStartProcess'
import { batchStartProcess } from "../../api";
import { toast } from "react-hot-toast";

interface BatchStartModalProps {
  processKey: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchStartModal({
  processKey,
  onClose,
  onSuccess,
}: BatchStartModalProps) {
  const [mode, setMode] = useState<"paste" | "csv">("paste");
  const [input, setInput] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PARSERS (Keep these same as before) ---

  const handleParseJson = () => {
    try {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed))
        throw new Error("Input must be a JSON Array [{}, {}]");
      setData(parsed);
      toast.success(`Loaded ${parsed.length} rows from JSON`);
    } catch (e: any) {
      toast.error("Invalid JSON: " + e.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());

        // 🟢 FIX: Remove quotes from the HEADER names too
        const headers = lines[0].split(",").map((h) => {
          let header = h.trim();
          if (header.startsWith('"') && header.endsWith('"')) {
            header = header.slice(1, -1);
          }
          return header;
        });

        const parsedData = lines.slice(1).map((line) => {
          const values = line.split(",");
          const obj: any = {};
          headers.forEach((header, index) => {
            let val = values[index]?.trim();
            // Remove quotes from values (already doing this, which is good)
            if (val && val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1);
            }
            obj[header] = val;
          });
          return obj;
        });

        setData(parsedData);
        toast.success(`Loaded ${parsedData.length} rows from CSV`);
      } catch (err) {
        toast.error("Failed to parse CSV");
      }
    };
    reader.readAsText(file);
  };

  // --- 🟢 NEW: SERVER-SIDE EXECUTION ---

  const handleRunBatch = async () => {
    if (!window.confirm(`⚠️ Start ${data.length} instances on the SERVER?`))
      return;

    setIsProcessing(true);
    setLogs(["⏳ Uploading batch to server... please wait."]);

    try {
      // 🚀 Single Call: Sends all data to backend
      const result = await batchStartProcess(processKey, data);

      // The backend returns { success: number, failed: number, logs: string[] }
      const serverLogs = result.logs || [];

      setLogs([
        `🏁 Batch Complete!`,
        `✅ Successful: ${result.success}`,
        `❌ Failed: ${result.failed}`,
        "--------------------------------",
        ...serverLogs,
      ]);

      if (result.success > 0) {
        toast.success(`Successfully started ${result.success} instances`);
        onSuccess();
      } else {
        toast.error("Batch failed. Check logs.");
      }
    } catch (err: any) {
      setLogs((prev) => [`❌ NETWORK ERROR: ${err.message}`, ...prev]);
      toast.error("Failed to send batch request");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
          <div>
            <h2 className="text-xl font-bold text-ink-primary flex items-center gap-2">
              <i className="fas fa-server text-brand-500"></i> Server-Side Batch
            </h2>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Target: {processKey}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-200 transition-colors"
          >
            <i className="fas fa-times text-neutral-500"></i>
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* LEFT: Input Zone */}
          <div className="w-1/2 p-5 flex flex-col gap-4 border-r border-neutral-100">
            <div className="flex bg-neutral-100 p-1 rounded-lg self-start">
              <button
                onClick={() => setMode("paste")}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === "paste" ? "bg-white shadow-sm text-brand-600" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                JSON Input
              </button>
              <button
                onClick={() => setMode("csv")}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === "csv" ? "bg-white shadow-sm text-brand-600" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                CSV Upload
              </button>
            </div>

            {mode === "paste" ? (
              <div className="flex-1 flex flex-col gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='[{"amount": 100, "client": "Acme"}, {"amount": 200, "client": "Beta"}]'
                  className="flex-1 w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none"
                />
                <button
                  onClick={handleParseJson}
                  className="w-full py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  Load JSON Data
                </button>
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-center p-8 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                  <i className="fas fa-file-csv text-xl"></i>
                </div>
                <p className="text-sm font-bold text-neutral-700 mb-1">
                  Upload CSV File
                </p>
                <p className="text-xs text-neutral-400 mb-4">
                  First row must contain variable names
                </p>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-neutral-800 text-white text-xs font-bold rounded-lg shadow-soft hover:scale-105 transition-transform"
                >
                  Select File
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Preview & Console */}
          <div className="w-1/2 flex flex-col bg-neutral-50">
            {/* Loading Indicator */}
            {isProcessing && (
              <div className="bg-brand-50 p-4 border-b border-brand-100 flex items-center justify-center gap-3">
                <i className="fas fa-cog fa-spin text-brand-600 text-xl"></i>
                <span className="text-brand-800 text-xs font-bold animate-pulse">
                  Processing on Backend...
                </span>
              </div>
            )}

            {/* Data Preview Table */}
            <div className="flex-1 overflow-auto border-b border-neutral-200 bg-white">
              {data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 opacity-50">
                  <i className="fas fa-table text-4xl mb-2"></i>
                  <span className="text-xs font-medium">No data loaded</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-100 sticky top-0 z-10">
                    <tr>
                      {Object.keys(data[0])
                        .slice(0, 4)
                        .map((k) => (
                          <th
                            key={k}
                            className="p-2 text-[10px] font-bold text-neutral-500 uppercase border-r border-neutral-200 last:border-0"
                          >
                            {k}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono text-neutral-600">
                    {data.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-neutral-100 hover:bg-neutral-50"
                      >
                        {Object.values(row)
                          .slice(0, 4)
                          .map((val: any, vi) => (
                            <td
                              key={vi}
                              className="p-2 truncate max-w-[100px] border-r border-neutral-100 last:border-0"
                            >
                              {String(val)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Console Logs */}
            <div className="h-1/3 bg-neutral-900 p-3 overflow-y-auto font-mono text-[10px]">
              {logs.length === 0 ? (
                <span className="text-neutral-600 italic">
                  Waiting to start...
                </span>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`mb-1 border-b border-white/5 pb-1 last:border-0 ${log.includes("❌") ? "text-red-400" : log.includes("✅") ? "text-green-400" : "text-neutral-300"}`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-100 bg-white flex justify-between items-center">
          <div className="text-xs text-neutral-500">
            <strong>{data.length}</strong> items ready
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRunBatch}
              disabled={data.length === 0 || isProcessing}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-brand-sm transition-all flex items-center gap-2"
            >
              {isProcessing ? (
                <i className="fas fa-circle-notch fa-spin"></i>
              ) : (
                <i className="fas fa-bolt"></i>
              )}
              Run Server Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
