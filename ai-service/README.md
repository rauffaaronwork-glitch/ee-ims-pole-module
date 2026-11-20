# Pole AI service (YOLO + OCR)

The scanner's "Detect parts with AI" button sends the photo to this service:

- **YOLO** finds the pole parts, the pole material, and *where* the pole
  number stencil and transformer kVA marking are.
- **OCR** (EasyOCR) reads the pole number and kVA from those spots. If YOLO
  didn't find a stencil, it reads the whole photo instead (less reliable).

It returns the same `Detection[]` list the scan page already uses.

## Run it

Needs Python 3.10–3.12. From this folder:

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Then in the web app's `.env.local`:

```
POLE_AI_URL=http://127.0.0.1:8000
```

and restart `npm run dev`. Check it at http://127.0.0.1:8000/health.

The first scan is slow (up to a minute): EasyOCR downloads its text models
(~100 MB) once, then loads them. Later scans take a few seconds on a laptop CPU.

**Before you train**, there is no `models/pole-yolo.pt`, so the service only
does OCR. Scans still work: the pole number and kVA come from OCR, and the scan
page shows "No trained model" so students tick the parts by hand.

## Train the model

### 1. Take photos

- A few hundred to 1,000+ photos of real poles around campus and town.
- Mix: morning/noon/afternoon, cloudy/sunny, near/far, different angles,
  concrete/steel/wood, with and without transformers.
- Ground level only. Same safety rule as the app.
- Include some close-ups of the stenciled pole number so OCR boxes are learnable.

### 2. Label them (Roboflow, free)

Create an **Object Detection** project and use these class names **exactly**
(also in `classes.txt`). Spelling matters: the service matches by name.

| Class | Draw the box around |
|---|---|
| `crossarm` | each crossarm |
| `pin_insulator` | each pin insulator |
| `suspension_insulator` | each suspension (disc) insulator string |
| `fuse_cutout` | each fuse cutout |
| `lightning_arrester` | each lightning/surge arrester |
| `distribution_transformer` | each pole-mounted transformer tank |
| `streetlight` | the streetlight head (and arm) |
| `guy_wire` | the guy wire / anchor rod |
| `service_drop` | the wires going to a house |
| `kwh_meter_cluster` | a cluster of kWh meters on the pole |
| `pole_concrete` / `pole_steel` / `pole_wood` | the whole pole body (pick one) |
| `pole_number_tag` | the stenciled or plate pole number, tight around the text |
| `kva_marking` | the kVA rating painted/printed on the transformer |

Tips: label *every* instance in a photo, or the model learns to ignore them.
Aim for 100+ boxes per class; rare classes (e.g. `pole_wood`) need extra photos.

Split train/valid/test about 70/20/10, then **Export → YOLOv11** format and
download the zip. Unzip it anywhere.

### 3. Train

```bash
.venv\Scripts\python train.py --data path\to\export\data.yaml
```

- Checks the class names, trains, and installs the best weights as
  `models/pole-yolo.pt`. Restart the service to use it.
- On a CPU this takes hours. A free Google Colab GPU is much faster:
  upload this folder and the dataset, `pip install -r requirements.txt`, run
  the same command, then download `models/pole-yolo.pt`.
- Results (precision, recall, mAP, confusion matrix) are saved in
  `runs/pole*/`. Those charts are good thesis results data.

## Pole number format

By default a pole number is 0–4 letters, an optional dash, 3–6 digits and an
optional letter (e.g. `TUG-01234`, `12345`, `CP-0456A`). If your cooperative
stencils numbers differently, set `POLE_NUMBER_REGEX`, e.g.:

```bash
set POLE_NUMBER_REGEX=^\d{2}-\d{4}$
```

## Settings

| Variable | Default | What |
|---|---|---|
| `POLE_MODEL` | `models/pole-yolo.pt` | YOLO weights to load |
| `POLE_CONF` | `0.25` | ignore boxes below this confidence |
| `POLE_NUMBER_REGEX` | see above | what counts as a pole number |
| `POLE_OCR` | `1` | `0` turns OCR off |

## Hosting

For phones outside your Wi-Fi, host this on a Hugging Face Docker Space or
Render, and set `POLE_AI_URL` on the web app to its
HTTPS address.
