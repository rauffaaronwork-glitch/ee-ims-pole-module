# EE-IMS Pole Mapping Module (prototype)

A working prototype of the **electric pole scanning and mapping** module for
EE-IMS (Integrated Management System, CSU Carig College of Engineering and
Architecture). It copies EE-IMS's look (dark theme, amber accent, XP system)
so it can be shown to the adviser and the EE-IMS maintainer, then merged in.

## Screens

| Page | Route | Who |
|---|---|---|
| Pole Scanner | `/student/poles/scan` | Students: photo, GPS, AI detection, specs, submit (+XP) |
| Pole Map | `/poles/map` | Everyone: map of poles, filters, details, CSV export |
| Pole Review | `/admin/poles` | Faculty: verify, flag for repair, or reject |

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. To test the camera and GPS on a phone, deploy it to
Vercel (free) and open the link on the phone. Browsers only allow camera/GPS on
HTTPS or localhost.

## Install it as an app

**Phone home screen (PWA):** open the https link in Chrome (Android) and tap
**Install**, or in Safari (iPhone) tap Share → **Add to Home Screen**. Needs
https: a tunnel link or a hosted (Vercel) link, not `http://192.168…`.

**Android APK:** `android/` is a Capacitor wrapper that opens the hosted app
in a full-screen app with camera and GPS permissions. On first launch it asks
for the server's https link and remembers it (tap "Change server" while it
opens to switch). To rebuild it (Java 21 and the Android SDK required):

```bash
npx cap sync android
cd android
./gradlew assembleDebug        # -> app/build/outputs/apk/debug/app-debug.apk
```

`android/local.properties` must point `sdk.dir` at your Android SDK. The
debug APK is for testing (install with "allow unknown apps"); a Play Store
release needs a signed `assembleRelease` build.

## What is real and what is simulated

| Part | Status |
|---|---|
| Layout, styling, navigation | Real |
| Camera capture, photo downscaling | Real |
| GPS location (with accuracy) | Real |
| Map with pins, filters, CSV export | Real (OpenStreetMap/CARTO tiles, free) |
| Faculty review flow, XP rules, quick-check question | Real UI logic |
| **AI detection** (`/api/poles/detect`) | **Real** when `POLE_AI_URL` points at `ai-service/` (YOLO + OCR). Pole number/kVA OCR works now; part detection needs a trained model. Without `POLE_AI_URL` it falls back to simulated demo data |
| **Data storage** | **Browser only** (localStorage) so the demo works without a database |
| Sample poles | Fake data, scattered around a sample area in Tuguegarao. Not real poles |

## Moving it into EE-IMS (for the maintainer)

1. Copy `src/app/student/poles`, `src/app/poles`, `src/app/admin/poles`,
   `src/app/api/poles`, `src/components/Pole*.tsx`, and `src/lib/types.ts`.
2. Skip `AppShell.tsx` and `PageHeader.tsx`: EE-IMS has its own layout.
   Just add the "Field Work" links to its existing sidebar.
3. Merge `prisma/schema.prisma` into EE-IMS's database schema, and link
   `surveyedById` / `reviewedById` to the real User table.
4. Replace `src/lib/store.ts` calls (`usePoles`, `addPole`, `updatePole`) with
   fetches to `/api/poles`, and make that route read/write the database using
   EE-IMS's existing login check.
5. Upload photos to file storage (e.g. Vercel Blob) and save only the URL.
6. Award XP through EE-IMS's existing XP logic.
7. Protect `/admin/poles` so only faculty can open it.

## Connecting the real AI

The service is in [`ai-service/`](ai-service/README.md): Python FastAPI with
- a **YOLO** model trained on labeled photos of local poles (crossarm,
  insulators, fuse cutout, arrester, transformer, streetlight, guy wire, ...)
- **OCR** (EasyOCR) for the stenciled pole number and transformer kVA marking

Run it, put `POLE_AI_URL=http://127.0.0.1:8000` in `.env.local`, and restart
`npm run dev`. See `ai-service/README.md` for labeling and training.

Dataset tip: label a few hundred to a thousand+ photos in Roboflow, taken in
different light and angles. Compare AI results against manual checks during
the campus pilot; that accuracy comparison is good results data.

## Safety

Surveys are from ground level only. No climbing or touching poles.
