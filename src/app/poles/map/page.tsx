"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Search, Download, Layers, Zap, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PoleDetail from "@/components/PoleDetail";
import { usePoles, STATUS_META } from "@/lib/store";
import type { Pole, PoleStatus } from "@/lib/types";

const PoleMap = dynamic(() => import("@/components/PoleMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-ims-muted">Loading map...</div>,
});

function toCSV(poles: Pole[]) {
  const head = ["pole_number", "lat", "lng", "material", "height_ft", "lines", "transformer_kva", "attachments", "condition", "status", "surveyed_by", "section", "surveyed_at"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = poles.map((p) =>
    [p.poleNumber, p.lat, p.lng, p.material, p.heightFt, p.lineType, p.transformerKVA ?? "", p.attachments.join("; "), p.condition, p.status, p.surveyedBy, p.section, p.surveyedAt].map(esc).join(","),
  );
  return [head.join(","), ...rows].join("\n");
}

export default function MapPage() {
  const poles = usePoles();
  const [status, setStatus] = useState<PoleStatus | "all">("all");
  const [txOnly, setTxOnly] = useState(false);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>();

  const shown = useMemo(
    () =>
      poles.filter(
        (p) =>
          p.status !== "rejected" &&
          (status === "all" || p.status === status) &&
          (!txOnly || p.transformerKVA) &&
          (!q || p.poleNumber.toLowerCase().includes(q.toLowerCase())),
      ),
    [poles, status, txOnly, q],
  );
  const selected = poles.find((p) => p.id === selectedId);
  const live = poles.filter((p) => p.status !== "rejected");
  const kvaTotal = live.reduce((s, p) => s + (p.transformerKVA ?? 0), 0);

  function exportCSV() {
    const blob = new Blob([toCSV(shown)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ee-ims-poles.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const stats = [
    { label: "Poles mapped", value: live.length, icon: Layers, cls: "text-white" },
    { label: "Verified", value: live.filter((p) => p.status === "verified").length, icon: CheckCircle2, cls: "text-emerald-300" },
    { label: "Pending review", value: live.filter((p) => p.status === "pending").length, icon: Clock, cls: "text-amber-300" },
    { label: "Needs repair", value: live.filter((p) => p.status === "needs_repair").length, icon: AlertTriangle, cls: "text-red-300" },
    { label: "Transformer kVA mapped", value: kvaTotal.toLocaleString(), icon: Zap, cls: "text-ims-amber" },
  ];

  return (
    <div>
      <PageHeader
        title="Pole Map"
        subtitle="Every pole surveyed by the department. Tap a pin to see its specs, photo and who mapped it."
        right={
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm">
            <Download className="h-4 w-4" /> Export CSV (QGIS / Google Earth)
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5 lg:px-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="flex items-center gap-2 text-xs text-ims-muted"><s.icon className="h-3.5 w-3.5" />{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 lg:px-6">
        {(["all", "verified", "pending", "needs_repair"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${status === s ? "border-ims-amber bg-ims-amber text-[#1a1206] font-semibold" : "border-ims-line text-gray-300 hover:bg-white/5"}`}
          >
            {s !== "all" && <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s].color }} />}
            {s === "all" ? "All" : STATUS_META[s].label}
          </button>
        ))}
        <button
          onClick={() => setTxOnly((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-sm ${txOnly ? "border-ims-amber/60 bg-ims-amber/15 text-amber-100" : "border-ims-line text-gray-300 hover:bg-white/5"}`}
        >
          With transformer
        </button>
        <div className="ml-auto flex w-full items-center gap-2 rounded-xl border border-ims-line bg-ims-card px-3 py-2 sm:w-64">
          <Search className="h-4 w-4 text-ims-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find pole number" className="w-full bg-transparent text-sm outline-none placeholder:text-ims-muted" />
        </div>
      </div>

      <div className="grid gap-5 px-4 pb-6 lg:grid-cols-[1fr_360px] lg:px-6">
        <div className="card h-[460px] overflow-hidden p-0 lg:h-[620px]">
          <PoleMap poles={shown} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="card p-5">
          {selected ? (
            <PoleDetail pole={selected}>
              <button onClick={() => setSelectedId(undefined)} className="btn-ghost mt-4 w-full py-2 text-sm">Back to list</button>
            </PoleDetail>
          ) : (
            <>
              <p className="mb-1 font-semibold text-white">{shown.length} poles</p>
              <p className="mb-3 text-sm text-ims-muted">Bigger pins have a transformer.</p>
              <ul className="max-h-[540px] space-y-1.5 overflow-y-auto pr-1">
                {shown.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setSelectedId(p.id)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-ims-panel px-3 py-2 text-left hover:bg-white/5">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[p.status].color }} />
                        <span className="font-mono text-sm text-gray-200">{p.poleNumber}</span>
                      </span>
                      <span className="text-xs text-ims-muted">{p.transformerKVA ? `${p.transformerKVA} kVA` : p.material}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
