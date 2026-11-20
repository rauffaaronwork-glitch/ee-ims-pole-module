import { NextResponse } from "next/server";
import type { DetectResponse, Detection } from "@/lib/types";

/**
 * POST /api/poles/detect  (multipart form: photo)
 *
 * Forwards the photo to the Python AI service (ai-service/: YOLO for parts,
 * OCR for the pole number and kVA) at POLE_AI_URL, e.g. http://127.0.0.1:8000.
 *
 * If POLE_AI_URL is not set, it falls back to simulated detections so the UI
 * can still be demoed. The response says which one you got (`simulated`).
 */
const AI_URL = process.env.POLE_AI_URL?.replace(/\/+$/, "");
const TIMEOUT_MS = 60_000; // first call is slow: the service loads YOLO and OCR models

export async function POST(req: Request) {
  const form = await req.formData();
  const photo = form.get("photo");
  if (!(photo instanceof Blob) || photo.size === 0) {
    return NextResponse.json({ error: "No photo was sent." }, { status: 400 });
  }

  if (!AI_URL) return NextResponse.json(simulate(photo.size));

  const out = new FormData();
  out.append("photo", photo, (photo as File).name || "pole.jpg");
  try {
    const res = await fetch(`${AI_URL}/detect`, { method: "POST", body: out, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      const msg = (data && (data.detail || data.error)) || `AI service answered ${res.status}.`;
      return NextResponse.json({ error: String(msg) }, { status: 502 });
    }
    return NextResponse.json(data as DetectResponse);
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "The AI service took too long. Try again." : "Can't reach the AI service. Is it running?" },
      { status: 502 },
    );
  }
}

/** Demo-only fake detections, used when POLE_AI_URL is not set. */
function simulate(size: number): DetectResponse {
  // Deterministic "random" from the file size so the same photo gives the same result
  const r = (k: number) => {
    const x = Math.sin(size * 0.001 + k * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const detections: Detection[] = [
    { label: "Pole number", value: `TUG-${String(1000 + Math.floor(r(2) * 900)).padStart(5, "0")}`, confidence: 0.78 + r(3) * 0.18 },
    { label: "Material", value: r(4) > 0.2 ? "Concrete" : "Steel", confidence: 0.9 + r(5) * 0.08 },
    { label: "Crossarm", confidence: 0.88 + r(6) * 0.1 },
    { label: "Pin insulator", confidence: 0.8 + r(7) * 0.15 },
  ];
  if (r(1) > 0.45) {
    detections.push(
      { label: "Distribution transformer", confidence: 0.9 + r(8) * 0.08 },
      { label: "Transformer rating", value: ["10", "15", "25", "37.5", "50"][Math.floor(r(9) * 5)], confidence: 0.55 + r(10) * 0.3 },
      { label: "Fuse cutout", confidence: 0.7 + r(11) * 0.2 },
      { label: "Lightning arrester", confidence: 0.62 + r(12) * 0.25 },
    );
  }
  if (r(13) > 0.4) detections.push({ label: "Streetlight", confidence: 0.85 + r(14) * 0.12 });
  if (r(15) > 0.5) detections.push({ label: "Service drop", confidence: 0.66 + r(16) * 0.2 });
  return { simulated: true, detections };
}
