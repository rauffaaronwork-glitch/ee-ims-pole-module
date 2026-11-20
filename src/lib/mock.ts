import type { Pole } from "./types";

// Sample data only. Coordinates are scattered around a sample area in
// Tuguegarao City and are NOT real pole positions.
export const MAP_CENTER: [number, number] = [17.6595, 121.7525];

const people = [
  ["Jason Gemido", "BSEE4B"],
  ["Charisma Malana", "BSEE4B"],
  ["Mark Dimalaluan", "BSEE4A"],
  ["Rauff Aaron Abergos", "BSEE4B"],
  ["Christian Daroni", "BSEE4A"],
] as const;

function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const materials = ["Concrete", "Concrete", "Concrete", "Steel", "Wood"] as const;
const heights = [30, 35, 35, 40, 45];
const conditions = ["Good", "Good", "Good", "Good", "Good", "Leaning", "Cracked", "Rusted", "Vegetation contact"] as const;
const kvas = [null, null, null, 10, 15, 25, 37.5, 50];

export const SAMPLE_POLES: Pole[] = Array.from({ length: 28 }, (_, i) => {
  const r = (k: number) => seeded(i * 7 + k);
  const material = materials[Math.floor(r(1) * materials.length)];
  const kva = kvas[Math.floor(r(2) * kvas.length)];
  const condition = conditions[Math.floor(r(3) * conditions.length)];
  const person = people[Math.floor(r(4) * people.length)];
  const statusRoll = r(5);
  const status: Pole["status"] =
    condition !== "Good" && statusRoll > 0.55 ? "needs_repair" : statusRoll > 0.3 ? "verified" : "pending";
  const attachments: Pole["attachments"] = ["Crossarm", "Pin insulator"];
  if (kva) attachments.push("Distribution transformer", "Fuse cutout", "Lightning arrester");
  if (r(6) > 0.5) attachments.push("Streetlight");
  if (r(7) > 0.6) attachments.push("Guy wire");
  if (r(8) > 0.4) attachments.push("Service drop");
  const day = 1 + Math.floor(r(9) * 19);
  return {
    id: `p${i + 1}`,
    poleNumber: `TUG-${String(1100 + i * 3).padStart(5, "0")}`,
    lat: 17.6595 + (r(10) - 0.5) * 0.012,
    lng: 121.7525 + (r(11) - 0.5) * 0.014,
    material,
    heightFt: heights[Math.floor(r(12) * heights.length)],
    lineType: r(13) > 0.45 ? "Primary + Secondary" : r(13) > 0.2 ? "Secondary" : "Primary",
    transformerKVA: kva,
    attachments,
    condition,
    status,
    surveyedBy: person[0],
    section: person[1],
    surveyedAt: new Date(Date.UTC(2026, 10, day, 1 + Math.floor(r(14) * 8))).toISOString(),
    aiConfidence: Math.round((0.72 + r(15) * 0.25) * 100) / 100,
  };
});

export const CURRENT_USER = {
  name: "Rauff Aaron Abergos",
  initials: "RA",
  section: "BSEE4B",
  role: "Student",
  xp: 460,
};

export const XP_RULES = {
  perScan: 15,
  verifiedBonus: 10,
  correctQuestion: 5,
};
