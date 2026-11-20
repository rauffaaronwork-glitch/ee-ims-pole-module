"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera, MapPin, Sparkles, Zap, Flame, CheckCircle2, Loader2, LocateFixed, ImagePlus,
  Trophy, ShieldAlert, ArrowRight, RotateCcw, CircleHelp, Map as MapIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/PageHeader";

// Leaflet touches `window`, so load the map only in the browser
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="grid h-72 place-items-center rounded-xl border border-ims-line text-sm text-ims-muted">Loading map...</div>,
});
import { addPole, usePoles, STATUS_META } from "@/lib/store";
import { CURRENT_USER, MAP_CENTER, XP_RULES } from "@/lib/mock";
import { ATTACHMENTS, type Attachment, type Condition, type DetectResponse, type Detection, type LineType, type PoleMaterial } from "@/lib/types";

const QUESTION = {
  q: "On a pole-mounted distribution transformer, which device protects the transformer from overcurrent?",
  options: ["Lightning arrester", "Fuse cutout", "Pin insulator", "Guy wire"],
  answer: "Fuse cutout",
  why: "The fuse cutout opens on overcurrent and isolates the transformer. The lightning arrester handles voltage surges, not overcurrent.",
};

async function downscale(file: File, max = 720): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Smaller JPEG for the AI: phone photos are 3-12 MB, 1600px is plenty for YOLO and OCR. */
async function shrinkForAI(file: File, max = 1600): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.9));
  } catch {
    return file; // unusual format the browser can't draw: send as is
  } finally {
    URL.revokeObjectURL(url);
  }
}

const KVA_OPTIONS = ["5", "10", "15", "25", "37.5", "50", "75", "100", "167"];

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-ims-amber/15 text-ims-amber"}`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : n}
        </span>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function ScanPage() {
  const poles = usePoles();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number; acc: number | null; source: "gps" | "map" } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [locState, setLocState] = useState<"idle" | "busy" | "error">("idle");
  const [locError, setLocError] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[] | null>(null);
  const [aiInfo, setAiInfo] = useState<{ simulated: boolean; warnings: string[] } | null>(null);
  const [aiError, setAiError] = useState("");

  const [poleNumber, setPoleNumber] = useState("");
  const [material, setMaterial] = useState<PoleMaterial>("Concrete");
  const [heightFt, setHeightFt] = useState(35);
  const [lineType, setLineType] = useState<LineType>("Primary + Secondary");
  const [kva, setKva] = useState<string>("none");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [condition, setCondition] = useState<Condition>("Good");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [submitted, setSubmitted] = useState<null | { poleNumber: string }>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  const mine = useMemo(() => poles.filter((p) => p.surveyedBy === CURRENT_USER.name), [poles]);
  const thisWeek = mine.filter((p) => new Date(p.surveyedAt) > new Date(Date.now() - 7 * 864e5)).length;
  const verified = mine.filter((p) => p.status === "verified").length;
  const fieldXp = mine.length * XP_RULES.perScan + verified * XP_RULES.verifiedBonus;
  const totalXp = CURRENT_USER.xp + fieldXp;
  const level = Math.floor(totalXp / 200) + 1;
  const toNext = level * 200 - totalXp;

  const conf = (label: string) => detections?.find((d) => d.label === label)?.confidence;

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    setErrors((e) => ({ ...e, photo: "" }));
    setRawFile(f);
    setPhoto(await downscale(f));
    setDetections(null);
    setAiInfo(null);
    setAiError("");
  }

  function getLocation() {
    if (!("geolocation" in navigator)) {
      setLocState("error");
      setLocError("This browser has no GPS access. Pick the pole on the map instead.");
      setMapOpen(true);
      return;
    }
    setLocState("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy), source: "gps" });
        setLocState("idle");
        setErrors((e) => ({ ...e, loc: "" }));
      },
      (err) => {
        setLocState("error");
        setLocError(
          !window.isSecureContext
            ? "Phones only allow GPS on https:// pages. Open the app's https link, or pick the pole on the map."
            : err.code === 1
              ? "Location permission was denied. Allow it in the browser settings, or pick the pole on the map."
              : "Couldn't get a GPS fix. Step outside and try again, or pick the pole on the map.",
        );
        setMapOpen(true);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function pinOnMap(p: { lat: number; lng: number }) {
    setLoc({ lat: p.lat, lng: p.lng, acc: null, source: "map" });
    setLocState("idle");
    setErrors((e) => ({ ...e, loc: "" }));
  }

  async function detect() {
    if (!rawFile) {
      setErrors((e) => ({ ...e, photo: "Take or upload a photo first." }));
      return;
    }
    setDetecting(true);
    setAiError("");
    try {
      const form = new FormData();
      form.append("photo", await shrinkForAI(rawFile), "pole.jpg");
      const res = await fetch("/api/poles/detect", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as Partial<DetectResponse>;
      if (!res.ok || !data.detections) {
        setAiError(data.error || "The AI couldn't read this photo. Try again, or fill in the specs yourself.");
        return;
      }
      setDetections(data.detections);
      setAiInfo({ simulated: !!data.simulated, warnings: data.warnings ?? [] });
      const num = data.detections.find((d) => d.label === "Pole number")?.value;
      if (num) {
        setPoleNumber(num);
        setErrors((e) => ({ ...e, poleNumber: "" }));
      }
      const mat = data.detections.find((d) => d.label === "Material")?.value as PoleMaterial | undefined;
      if (mat) setMaterial(mat);
      const rating = data.detections.find((d) => d.label === "Transformer rating")?.value;
      setKva(rating && KVA_OPTIONS.includes(rating) ? rating : "none");
      setAttachments(data.detections.map((d) => d.label).filter((l): l is Attachment => (ATTACHMENTS as readonly string[]).includes(l)));
    } catch {
      setAiError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setDetecting(false);
    }
  }

  function toggle(a: Attachment) {
    setAttachments((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  }

  function submit() {
    const e: Record<string, string> = {};
    if (!photo) e.photo = "A photo of the pole is required.";
    if (!loc) e.loc = "Capture the pole's location.";
    if (!poleNumber.trim()) e.poleNumber = "Enter the pole number stenciled on the pole.";
    setErrors(e);
    if (Object.keys(e).length) return;

    const avg = detections?.length ? detections.reduce((s, d) => s + d.confidence, 0) / detections.length : null;
    addPole({
      id: `p${Date.now()}`,
      poleNumber: poleNumber.trim().toUpperCase(),
      lat: loc!.lat,
      lng: loc!.lng,
      material,
      heightFt,
      lineType,
      transformerKVA: kva === "none" ? null : Number(kva),
      attachments,
      condition,
      status: "pending",
      photo: photo!,
      surveyedBy: CURRENT_USER.name,
      section: CURRENT_USER.section,
      surveyedAt: new Date().toISOString(),
      aiConfidence: avg ? Math.round(avg * 100) / 100 : null,
      notes: notes.trim() || undefined,
    });
    setSubmitted({ poleNumber: poleNumber.trim().toUpperCase() });
    setAnswer(null);
  }

  function reset() {
    setPhoto(null); setRawFile(null); setLoc(null); setMapOpen(false); setDetections(null); setAiInfo(null); setAiError(""); setPoleNumber("");
    setMaterial("Concrete"); setHeightFt(35); setLineType("Primary + Secondary"); setKva("none");
    setAttachments([]); setCondition("Good"); setNotes(""); setErrors({}); setSubmitted(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <PageHeader
        title="Pole Scanner"
        subtitle="Photograph an electric pole from the ground, let the AI read its parts, check the specs, and add it to the department's pole map."
      />

      <div className="mx-4 mt-5 flex items-start gap-3 rounded-2xl border border-ims-amber/30 bg-gradient-to-r from-amber-500/10 to-transparent p-4 lg:mx-6">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-ims-amber" />
        <p className="text-sm text-gray-200">
          <b className="text-white">Ground level only.</b> Never climb, touch, or stand under a pole with sagging or damaged lines. Report hazards to the electric cooperative right away.
        </p>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[1fr_340px] lg:p-6">
        <div className="space-y-5">
          <Step n={1} title="Photo of the pole" done={!!photo}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            {photo ? (
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="Pole photo" className="h-56 w-full rounded-xl border border-ims-line object-cover sm:w-56" />
                <div className="flex flex-col justify-between gap-3">
                  <p className="text-sm text-ims-muted">
                    Frame the whole pole, top to bottom, with the stenciled number visible. Daylight works best.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={detect} disabled={detecting} className="btn-amber flex items-center gap-2 px-4 py-2.5 disabled:opacity-60">
                      {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {detecting ? "Reading the pole..." : detections ? "Run AI again" : "Detect parts with AI"}
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="btn-ghost px-4 py-2.5 text-sm">Retake</button>
                  </div>
                  {detecting && !detections && (
                    <p className="text-xs text-ims-muted">The first scan after the AI starts can take up to a minute while it loads.</p>
                  )}
                  {aiError && <p className="text-sm text-red-400">{aiError}</p>}
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ims-line py-10 text-ims-muted hover:border-ims-amber/60 hover:text-gray-200"
              >
                <Camera className="h-8 w-8 text-ims-amber" />
                <span className="font-semibold text-white">Take a photo</span>
                <span className="text-sm">Opens the camera on phones, or pick an image on a computer</span>
              </button>
            )}
            {errors.photo && <p className="mt-2 text-sm text-red-400">{errors.photo}</p>}
          </Step>

          <Step n={2} title="Location" done={!!loc}>
            {loc ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ims-line bg-ims-panel p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="font-mono text-sm text-white">{loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</p>
                    <p className="text-xs text-ims-muted">
                      {loc.source === "gps" ? `GPS accuracy ±${loc.acc} m` : "Pinned on the map"}
                      {loc.source === "gps" && (loc.acc ?? 0) > 15 && " (rough: drag the pin onto the pole)"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={getLocation} disabled={locState === "busy"} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm disabled:opacity-60">
                    {locState === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} GPS
                  </button>
                  <button onClick={() => setMapOpen((o) => !o)} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm">
                    <MapIcon className="h-4 w-4" /> {mapOpen ? "Hide map" : "Adjust on map"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button onClick={getLocation} disabled={locState === "busy"} className="btn-amber flex items-center gap-2 px-4 py-2.5 disabled:opacity-60">
                  {locState === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                  {locState === "busy" ? "Getting GPS fix..." : "Use my GPS location"}
                </button>
                <button onClick={() => setMapOpen((o) => !o)} className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm">
                  <MapIcon className="h-4 w-4" /> {mapOpen ? "Hide map" : "Pick on map"}
                </button>
              </div>
            )}
            {mapOpen && (
              <div className="mt-3">
                <LocationPicker value={loc} center={MAP_CENTER} onChange={pinOnMap} />
              </div>
            )}
            {locState === "error" && <p className="mt-2 text-sm text-amber-300">{locError}</p>}
            {errors.loc && <p className="mt-2 text-sm text-red-400">{errors.loc}</p>}
            <p className="mt-3 text-xs text-ims-muted">Stand right beside the pole when capturing so the pin lands on it.</p>
          </Step>

          <Step n={3} title="Check the specs" done={!!poleNumber && !!detections}>
            {detections && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 p-3 text-sm text-purple-100">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {detections.length
                    ? <>The AI found {detections.length} item{detections.length === 1 ? "" : "s"}. Percentages show how sure it is, so double-check anything below 70%.</>
                    : <>The AI didn&apos;t find anything it&apos;s sure of. Fill in the specs below yourself.</>}
                  {aiInfo?.simulated && (
                    <span className="text-purple-300"> (Demo mode: these are simulated. Set POLE_AI_URL to use the real AI service.)</span>
                  )}
                  {aiInfo?.warnings.map((w) => (
                    <span key={w} className="mt-1 block text-amber-200">{w}</span>
                  ))}
                </span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm text-gray-300">
                  Pole number {conf("Pole number") && <Conf v={conf("Pole number")!} />}
                </span>
                <input
                  className="input font-mono uppercase placeholder:normal-case"
                  placeholder="e.g. TUG-01234"
                  value={poleNumber}
                  onChange={(e) => { setPoleNumber(e.target.value); setErrors((x) => ({ ...x, poleNumber: "" })); }}
                />
                {errors.poleNumber && <span className="mt-1 block text-sm text-red-400">{errors.poleNumber}</span>}
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm text-gray-300">
                  Material {conf("Material") && <Conf v={conf("Material")!} />}
                </span>
                <select className="input" value={material} onChange={(e) => setMaterial(e.target.value as PoleMaterial)}>
                  {["Concrete", "Steel", "Wood"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-gray-300">Height (estimated)</span>
                <select className="input" value={heightFt} onChange={(e) => setHeightFt(Number(e.target.value))}>
                  {[25, 30, 35, 40, 45, 50].map((h) => <option key={h} value={h}>{h} ft</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-gray-300">Lines carried</span>
                <select className="input" value={lineType} onChange={(e) => setLineType(e.target.value as LineType)}>
                  {["Primary", "Secondary", "Primary + Secondary"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm text-gray-300">
                  Transformer rating {conf("Transformer rating") && <Conf v={conf("Transformer rating")!} />}
                </span>
                <select className="input" value={kva} onChange={(e) => setKva(e.target.value)}>
                  <option value="none">No transformer</option>
                  {KVA_OPTIONS.map((k) => <option key={k} value={k}>{k} kVA</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-gray-300">Condition</span>
                <select className="input" value={condition} onChange={(e) => setCondition(e.target.value as Condition)}>
                  {["Good", "Leaning", "Cracked", "Rusted", "Vegetation contact"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <p className="mb-2 mt-5 text-sm text-gray-300">Attachments on the pole</p>
            <div className="flex flex-wrap gap-2">
              {ATTACHMENTS.map((a) => {
                const on = attachments.includes(a);
                const c = conf(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggle(a)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${on ? "border-ims-amber/60 bg-ims-amber/15 text-amber-100" : "border-ims-line text-ims-muted hover:text-gray-200"}`}
                  >
                    {on && <CheckCircle2 className="h-3.5 w-3.5 text-ims-amber" />}
                    {a}
                    {c !== undefined && <span className={`text-xs ${c < 0.7 ? "text-amber-400" : "text-emerald-300"}`}>{Math.round(c * 100)}%</span>}
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm text-gray-300">Notes (optional)</span>
              <textarea className="input min-h-20" placeholder="e.g. leaning toward the road, vines on guy wire" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </Step>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ims-muted">
              +{XP_RULES.perScan} XP when you submit · +{XP_RULES.verifiedBonus} XP more when faculty verifies it
            </p>
            <button onClick={submit} className="btn-amber flex items-center gap-2 px-6 py-3 text-base">
              Submit pole <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-ims-muted">Level {level}</p>
                <p className="text-2xl font-bold text-white">Spark</p>
              </div>
              <span className="flex items-center gap-1 font-bold text-ims-amber"><Zap className="h-4 w-4" />{totalXp} XP</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-ims-amber" style={{ width: `${((200 - toNext) / 200) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-ims-muted">{toNext} XP to level {level + 1} · {fieldXp} XP from field work</p>
          </div>

          <div className="card p-5">
            <p className="flex items-center gap-2 font-semibold text-white"><Flame className="h-4 w-4 text-ims-amber" /> Weekly field challenge</p>
            <p className="mt-1 text-sm text-ims-muted">Map 10 poles this week · +60 XP</p>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-ims-amber" style={{ width: `${Math.min(100, (thisWeek / 10) * 100)}%` }} />
            </div>
            <p className="mt-2 text-right text-sm text-ims-muted">{Math.min(thisWeek, 10)}/10</p>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-white">My scans</p>
              <Link href="/poles/map" className="text-sm text-ims-amber hover:underline">Open map</Link>
            </div>
            {mine.length === 0 && <p className="text-sm text-ims-muted">No poles yet. Your first scan shows up here.</p>}
            <ul className="space-y-2">
              {mine.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-ims-panel px-3 py-2">
                  <span className="font-mono text-sm text-gray-200">{p.poleNumber}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_META[p.status].bg} ${STATUS_META[p.status].text}`}>{STATUS_META[p.status].label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {submitted && (
        <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/70 p-4">
          <div className="card w-full max-w-lg p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500/15"><CheckCircle2 className="h-6 w-6 text-emerald-400" /></span>
              <div>
                <p className="text-lg font-bold text-white">Pole {submitted.poleNumber} submitted</p>
                <p className="flex items-center gap-1 text-sm text-ims-amber"><Zap className="h-3.5 w-3.5" /> +{XP_RULES.perScan} XP · waiting for faculty review</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-ims-line bg-ims-panel p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><CircleHelp className="h-4 w-4 text-ims-amber" /> Quick check · +{XP_RULES.correctQuestion} XP</p>
              <p className="mb-3 text-sm text-gray-200">{QUESTION.q}</p>
              <div className="grid gap-2">
                {QUESTION.options.map((o) => {
                  const picked = answer === o;
                  const right = o === QUESTION.answer;
                  const cls = !answer
                    ? "border-ims-line hover:border-ims-amber/60"
                    : right
                      ? "border-emerald-400/60 bg-emerald-500/10"
                      : picked
                        ? "border-red-400/60 bg-red-500/10"
                        : "border-ims-line opacity-60";
                  return (
                    <button key={o} disabled={!!answer} onClick={() => setAnswer(o)} className={`rounded-lg border px-3 py-2 text-left text-sm ${cls}`}>
                      {o}
                    </button>
                  );
                })}
              </div>
              {answer && (
                <p className={`mt-3 text-sm ${answer === QUESTION.answer ? "text-emerald-300" : "text-amber-200"}`}>
                  {answer === QUESTION.answer ? "Correct! " : "Not quite. "}
                  {QUESTION.why}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link href="/poles/map" className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm"><Trophy className="h-4 w-4" /> See it on the map</Link>
              <button onClick={reset} className="btn-amber flex items-center gap-2 px-4 py-2.5 text-sm"><RotateCcw className="h-4 w-4" /> Scan next pole</button>
            </div>
          </div>
        </div>
      )}

      {!photo && !submitted && (
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-amber fixed bottom-5 right-5 z-[600] flex items-center gap-2 px-5 py-3 shadow-lg lg:hidden"
        >
          <ImagePlus className="h-5 w-5" /> Scan
        </button>
      )}
    </div>
  );
}

function Conf({ v }: { v: number }) {
  return (
    <span className={`flex items-center gap-1 text-xs ${v < 0.7 ? "text-amber-400" : "text-emerald-300"}`}>
      <Sparkles className="h-3 w-3" /> AI {Math.round(v * 100)}%
    </span>
  );
}
