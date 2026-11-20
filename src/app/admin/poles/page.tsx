"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Trophy, RotateCcw, Inbox } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PoleDetail from "@/components/PoleDetail";
import { usePoles, updatePole, resetPoles, STATUS_META } from "@/lib/store";
import { XP_RULES } from "@/lib/mock";

export default function ReviewPage() {
  const poles = usePoles();
  const [tab, setTab] = useState<"pending" | "reviewed">("pending");
  const [selectedId, setSelectedId] = useState<string>();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");

  const pending = poles.filter((p) => p.status === "pending");
  const reviewed = poles.filter((p) => p.status !== "pending");
  const list = tab === "pending" ? pending : reviewed;
  const selected = poles.find((p) => p.id === selectedId) ?? list[0];

  const board = useMemo(() => {
    const m = new Map<string, { name: string; section: string; poles: number; verified: number }>();
    poles.forEach((p) => {
      if (p.status === "rejected") return;
      const e = m.get(p.surveyedBy) ?? { name: p.surveyedBy, section: p.section, poles: 0, verified: 0 };
      e.poles++;
      if (p.status !== "pending") e.verified++;
      m.set(p.surveyedBy, e);
    });
    return [...m.values()].sort((a, b) => b.poles - a.poles);
  }, [poles]);

  function act(kind: "verified" | "needs_repair" | "rejected") {
    if (!selected) return;
    if (kind === "rejected" && !note.trim()) {
      setNoteError("Add a short reason so the student knows what to fix.");
      return;
    }
    updatePole(selected.id, { status: kind, reviewNote: note.trim() || undefined });
    setNote("");
    setNoteError("");
    const next = pending.find((p) => p.id !== selected.id);
    setSelectedId(next?.id);
  }

  return (
    <div>
      <PageHeader
        title="Pole Review"
        subtitle="Check student submissions against the photo before they count on the official map. Verified poles give the student bonus XP."
        right={
          <button onClick={() => { resetPoles(); setSelectedId(undefined); }} className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm" title="Prototype only">
            <RotateCcw className="h-4 w-4" /> Reset demo data
          </button>
        }
      />

      <div className="grid gap-5 p-4 lg:grid-cols-[300px_1fr_300px] lg:p-6">
        <div className="card p-4">
          <div className="mb-3 flex rounded-full border border-ims-line p-1 text-sm">
            {(["pending", "reviewed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedId(undefined); }}
                className={`flex-1 rounded-full py-1.5 ${tab === t ? "bg-ims-amber font-semibold text-[#1a1206]" : "text-gray-300"}`}
              >
                {t === "pending" ? `Pending (${pending.length})` : `Reviewed (${reviewed.length})`}
              </button>
            ))}
          </div>
          {list.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-ims-muted">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">Nothing to review. New scans land here.</p>
            </div>
          )}
          <ul className="max-h-[600px] space-y-1.5 overflow-y-auto pr-1">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => { setSelectedId(p.id); setNoteError(""); }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left ${selected?.id === p.id ? "bg-ims-amber/15 ring-1 ring-ims-amber/50" : "bg-ims-panel hover:bg-white/5"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-white">{p.poleNumber}</span>
                    <span className={`text-xs ${STATUS_META[p.status].text}`}>{STATUS_META[p.status].label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ims-muted">{p.surveyedBy} · {new Date(p.surveyedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          {selected ? (
            <PoleDetail pole={selected}>
              {selected.status === "pending" && (
                <div className="mt-5 border-t border-ims-line pt-5">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-300">Note to student (required to reject)</span>
                    <textarea
                      className="input min-h-16"
                      value={note}
                      onChange={(e) => { setNote(e.target.value); setNoteError(""); }}
                      placeholder="e.g. Pole number not visible in photo, retake from the road side"
                    />
                  </label>
                  {noteError && <p className="mt-1 text-sm text-red-400">{noteError}</p>}
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button onClick={() => act("verified")} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Verify
                    </button>
                    <button onClick={() => act("needs_repair")} className="flex items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/20">
                      <AlertTriangle className="h-4 w-4" /> Verify + flag repair
                    </button>
                    <button onClick={() => act("rejected")} className="btn-ghost flex items-center justify-center gap-2 px-3 py-2.5 text-sm">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ims-muted">Verifying gives {selected.surveyedBy.split(" ")[0]} +{XP_RULES.verifiedBonus} XP.</p>
                </div>
              )}
            </PoleDetail>
          ) : (
            <p className="py-20 text-center text-ims-muted">Select a submission.</p>
          )}
        </div>

        <div className="card h-fit p-5">
          <p className="flex items-center gap-2 font-semibold text-white"><Trophy className="h-4 w-4 text-ims-amber" /> Top field surveyors</p>
          <p className="mb-3 text-sm text-ims-muted">Poles mapped this semester</p>
          <ol className="space-y-2">
            {board.map((b, i) => (
              <li key={b.name} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-3">
                  <span className={`w-5 text-center ${i < 3 ? "text-ims-amber font-bold" : "text-ims-muted"}`}>{i + 1}</span>
                  <span className="text-gray-200">{b.name}</span>
                </span>
                <span className="text-ims-muted">{b.poles} · {b.verified} ok</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
