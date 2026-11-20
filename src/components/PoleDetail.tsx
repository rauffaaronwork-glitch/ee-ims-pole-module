import { MapPin, Sparkles, User, CalendarDays, Zap } from "lucide-react";
import type { Pole } from "@/lib/types";
import { STATUS_META } from "@/lib/store";
import PoleIllustration from "./PoleIllustration";

export default function PoleDetail({ pole, children }: { pole: Pole; children?: React.ReactNode }) {
  const s = STATUS_META[pole.status];
  const rows: [string, string][] = [
    ["Material", pole.material],
    ["Height", `${pole.heightFt} ft (est.)`],
    ["Lines", pole.lineType],
    ["Transformer", pole.transformerKVA ? `${pole.transformerKVA} kVA` : "None"],
    ["Condition", pole.condition],
  ];
  return (
    <div>
      <div className="relative h-44 overflow-hidden rounded-xl border border-ims-line bg-ims-panel">
        {pole.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pole.photo} alt={`Pole ${pole.poleNumber}`} className="h-full w-full object-cover" />
        ) : (
          <PoleIllustration pole={pole} />
        )}
        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur ${s.bg} ${s.text}`}>{s.label}</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="font-mono text-lg font-bold text-white">{pole.poleNumber}</p>
        {pole.aiConfidence !== null && (
          <span className="flex items-center gap-1 text-xs text-purple-300"><Sparkles className="h-3 w-3" /> AI {Math.round(pole.aiConfidence * 100)}%</span>
        )}
      </div>
      <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-ims-muted"><MapPin className="h-3.5 w-3.5" /> {pole.lat.toFixed(5)}, {pole.lng.toFixed(5)}</p>

      <dl className="mt-4 divide-y divide-ims-line rounded-xl border border-ims-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-3 py-2 text-sm">
            <dt className="text-ims-muted">{k}</dt>
            <dd className={`font-medium ${k === "Condition" && v !== "Good" ? "text-red-300" : "text-gray-100"}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mb-2 mt-4 text-sm text-gray-300">Attachments</p>
      <div className="flex flex-wrap gap-1.5">
        {pole.attachments.map((a) => (
          <span key={a} className="rounded-full border border-ims-line bg-ims-panel px-2.5 py-1 text-xs text-gray-200">{a}</span>
        ))}
      </div>

      {pole.notes && <p className="mt-4 rounded-lg bg-ims-panel p-3 text-sm text-gray-300">“{pole.notes}”</p>}
      {pole.reviewNote && <p className="mt-2 rounded-lg border border-ims-line p-3 text-sm text-gray-300"><b className="text-white">Faculty:</b> {pole.reviewNote}</p>}

      <div className="mt-4 space-y-1 text-xs text-ims-muted">
        <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {pole.surveyedBy} · {pole.section}</p>
        <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {new Date(pole.surveyedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
        {pole.status === "verified" && <p className="flex items-center gap-1.5 text-ims-amber"><Zap className="h-3.5 w-3.5" /> Verified, bonus XP awarded</p>}
      </div>
      {children}
    </div>
  );
}
