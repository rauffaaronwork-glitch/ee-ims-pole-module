export type PoleStatus = "pending" | "verified" | "needs_repair" | "rejected";
export type PoleMaterial = "Concrete" | "Steel" | "Wood";
export type LineType = "Primary" | "Secondary" | "Primary + Secondary";
export type Condition = "Good" | "Leaning" | "Cracked" | "Rusted" | "Vegetation contact";

export const ATTACHMENTS = [
  "Crossarm",
  "Pin insulator",
  "Suspension insulator",
  "Fuse cutout",
  "Lightning arrester",
  "Distribution transformer",
  "Streetlight",
  "Guy wire",
  "Service drop",
  "kWh meter cluster",
] as const;
export type Attachment = (typeof ATTACHMENTS)[number];

export interface Pole {
  id: string; // internal record id
  poleNumber: string; // stenciled number on the pole (read by OCR)
  lat: number;
  lng: number;
  material: PoleMaterial;
  heightFt: number;
  lineType: LineType;
  transformerKVA: number | null;
  attachments: Attachment[];
  condition: Condition;
  status: PoleStatus;
  photo?: string; // data URL in the prototype; storage URL in production
  surveyedBy: string;
  section: string;
  surveyedAt: string; // ISO
  aiConfidence: number | null; // 0-1, average detection confidence
  notes?: string;
  reviewNote?: string;
}

export interface Detection {
  label: Attachment | "Pole number" | "Material" | "Transformer rating";
  value?: string;
  confidence: number;
}

/** What POST /api/poles/detect returns. */
export interface DetectResponse {
  simulated: boolean; // true = demo data, no AI service configured
  modelLoaded?: boolean; // false = AI service is up but has no trained YOLO model yet
  detections: Detection[];
  boxes?: { class: string; confidence: number; xyxy: [number, number, number, number] }[];
  imageSize?: [number, number];
  warnings?: string[];
  error?: string;
}
