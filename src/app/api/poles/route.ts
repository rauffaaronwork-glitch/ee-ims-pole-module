import { NextResponse } from "next/server";
import { SAMPLE_POLES } from "@/lib/mock";

/**
 * GET  /api/poles      -> list poles (for the map)
 * POST /api/poles      -> create a pole survey
 *
 * PROTOTYPE: the UI keeps data in the browser (src/lib/store.ts), so these
 * routes only show the shape EE-IMS needs. When moving into EE-IMS:
 *   - check the logged-in user with EE-IMS's existing auth
 *   - save with the database client EE-IMS already uses (see prisma/schema.prisma)
 *   - upload the photo to file storage (e.g. Vercel Blob) and save its URL
 *   - award XP through EE-IMS's existing XP logic
 */
export async function GET() {
  return NextResponse.json(SAMPLE_POLES);
}

export async function POST(req: Request) {
  const body = await req.json();
  const required = ["poleNumber", "lat", "lng", "material"];
  const missing = required.filter((k) => body[k] === undefined || body[k] === "");
  if (missing.length) {
    return NextResponse.json({ error: `Missing: ${missing.join(", ")}` }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: `p${Date.now()}`, xpAwarded: 15 }, { status: 201 });
}
