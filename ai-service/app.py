"""Pole AI service: YOLO (pole parts) + OCR (pole number, transformer kVA).

POST /detect   multipart form, field "photo"  -> { detections, boxes, warnings, ... }
GET  /health                                  -> what is loaded

Settings (environment variables, all optional):
  POLE_MODEL          path to trained YOLO weights   (default: models/pole-yolo.pt)
  POLE_CONF           minimum YOLO box confidence     (default: 0.25)
  POLE_NUMBER_REGEX   pattern a pole number must match
                      (default: optional 1-4 letters, optional dash, 3-6 digits, optional letter)
  POLE_OCR            "1" to run OCR, "0" to skip it   (default: 1)

Run:  uvicorn app:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import io
import os
import re
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps

from classes import ROLE

HERE = Path(__file__).parent
MODEL_PATH = Path(os.getenv("POLE_MODEL", HERE / "models" / "pole-yolo.pt"))
CONF = float(os.getenv("POLE_CONF", "0.25"))
OCR_ON = os.getenv("POLE_OCR", "1") != "0"
POLE_NUMBER_RE = re.compile(os.getenv("POLE_NUMBER_REGEX", r"^[A-Z]{0,4}-?\d{3,6}[A-Z]?$"))
KVA_RE = re.compile(r"(\d{1,3}(?:\.\d)?)\s*K\s*V\s*A")
STANDARD_KVA = {"5", "10", "15", "25", "37.5", "50", "75", "100", "167"}
MAX_BYTES = 15 * 1024 * 1024
MAX_SIDE = 1600  # downscale big phone photos before running the models

@asynccontextmanager
async def lifespan(_app):
    # Load models in the background right away, so the first student scan
    # doesn't wait for (or time out on) the OCR download.
    threading.Thread(target=lambda: _warm_up(), daemon=True).start()
    yield


app = FastAPI(title="Pole AI service", lifespan=lifespan)

_model = None
_model_error: str | None = None
_reader = None
_reader_error: str | None = None
_lock = threading.Lock()
_init_lock = threading.Lock()  # so two early requests don't both load the models


def get_model():
    """Load YOLO weights once. Returns None if there is no trained model yet."""
    global _model, _model_error
    with _init_lock:
        if _model is not None or _model_error is not None:
            return _model
        if not MODEL_PATH.exists():
            _model_error = f"No trained model at {MODEL_PATH}. Train one (see ai-service/README.md)."
            return None
        try:
            from ultralytics import YOLO

            _model = YOLO(str(MODEL_PATH))
        except Exception as e:  # noqa: BLE001
            _model_error = f"Could not load {MODEL_PATH}: {e}"
        return _model


def get_reader():
    """Load EasyOCR once (downloads its text models, ~100 MB, the very first time)."""
    global _reader, _reader_error
    if not OCR_ON:
        return None
    with _init_lock:
        if _reader is not None or _reader_error is not None:
            return _reader
        try:
            import easyocr

            _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        except Exception as e:  # noqa: BLE001
            _reader_error = f"OCR not available: {e}"
        return _reader


_ready = threading.Event()


def _warm_up():
    try:
        get_model()
        get_reader()
    finally:
        _ready.set()


def load_image(data: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img).convert("RGB")  # phones store rotation in EXIF
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    return np.asarray(img)


def crop(img: np.ndarray, xyxy: list[float], pad: float = 0.15) -> np.ndarray:
    h, w = img.shape[:2]
    x1, y1, x2, y2 = xyxy
    px, py = (x2 - x1) * pad, (y2 - y1) * pad
    x1, y1 = max(0, int(x1 - px)), max(0, int(y1 - py))
    x2, y2 = min(w, int(x2 + px)), min(h, int(y2 + py))
    return img[y1:y2, x1:x2]


def read_text(img: np.ndarray) -> list[tuple[str, float]]:
    """OCR an image. Returns (text, confidence) pieces, uppercased."""
    reader = get_reader()
    if reader is None or img.size == 0:
        return []
    with _lock:  # EasyOCR isn't thread-safe
        results = reader.readtext(img, detail=1, paragraph=False)
    return [(str(t).upper().strip(), float(c)) for _, t, c in results if str(t).strip()]


_LOOKALIKE = str.maketrans({"O": "0", "Q": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8"})


def fix_digits(t: str) -> str:
    """OCR mixes up O/0, I/1, S/5... Fix them only in the number part.

    "TUG-O1234" -> "TUG-01234". The letter prefix is everything before the
    first digit (or the dash), so letters there are left alone.
    """
    m = re.match(r"^([A-Z]{0,4}-?)(.+)$", t)
    if not m:
        return t
    prefix, rest = m.groups()
    if not re.search(r"\d", rest):
        return t
    head, tail = (rest[:-1], rest[-1]) if rest[-1].isalpha() and len(rest) > 3 else (rest, "")
    return prefix + head.translate(_LOOKALIKE) + tail


def find_pole_number(pieces: list[tuple[str, float]]) -> tuple[str, float] | None:
    best = None
    # try single pieces, then neighbours joined (OCR often splits "TUG" and "01234")
    candidates = list(pieces)
    candidates += [(a + "-" + b, min(ca, cb)) for (a, ca), (b, cb) in zip(pieces, pieces[1:])]
    best_score = -1.0
    for text, c in candidates:
        t = re.sub(r"^(POLE\s*)?(NO\b\.?|#)\s*", "", text.strip())  # drop a "NO." / "#" label
        t = re.sub(r"[\s_.:]+", "", t).replace("--", "-").strip("-")
        t = fix_digits(t)
        # prefer the fuller read ("TUG-01234" over "O1234") when OCR confidence is close
        score = c + 0.02 * len(t)
        if POLE_NUMBER_RE.match(t) and score > best_score:
            best, best_score = (t, c), score
    return best


def find_kva(pieces: list[tuple[str, float]], from_tag: bool) -> tuple[str, float] | None:
    joined = " ".join(t for t, _ in pieces)
    m = KVA_RE.search(joined)
    if m:
        value = m.group(1)
        c = max((c for t, c in pieces if value in t), default=0.5)
        return value, c
    if from_tag:  # inside a kVA marking box a bare number is enough
        for t, c in pieces:
            n = re.sub(r"[^\d.]", "", t)
            if n in STANDARD_KVA:
                return n, c * 0.9
    return None


@app.get("/health")
def health():
    return {
        "ok": True,
        "ready": _ready.is_set(),
        "modelLoaded": _model is not None,
        "modelPath": str(MODEL_PATH),
        "modelError": _model_error,
        "ocr": OCR_ON and _reader_error is None,
        "ocrError": _reader_error,
    }


@app.post("/detect")
def detect(photo: UploadFile = File(...)):
    # plain def: FastAPI runs it on a worker thread, so slow model calls
    # don't freeze the server for other requests
    if not _ready.wait(timeout=20):
        raise HTTPException(503, "The AI is still starting up (first start downloads its models). Try again in a minute.")
    data = photo.file.read()
    if not data:
        raise HTTPException(400, "Empty photo.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Photo is larger than 15 MB.")
    try:
        img = load_image(data)
    except Exception:  # noqa: BLE001
        raise HTTPException(400, "That file isn't a readable image.")

    warnings: list[str] = []
    boxes: list[dict] = []
    detections: list[dict] = []

    # 1) YOLO: pole parts, pole material, and where the text tags are
    model = get_model()
    if model is None:
        # full reason (with file path) is on /health; students get a plain one
        warnings.append("Part detection isn't trained yet, so tick the parts you see yourself. The pole number and kVA were read by OCR.")
    else:
        result = model.predict(img, conf=CONF, verbose=False)[0]
        names = result.names
        for b in result.boxes:
            name = names[int(b.cls)]
            boxes.append({"class": name, "confidence": float(b.conf), "xyxy": [float(v) for v in b.xyxy[0].tolist()]})

    best: dict[str, dict] = {}  # highest-confidence box per class
    for b in boxes:
        if b["class"] not in best or b["confidence"] > best[b["class"]]["confidence"]:
            best[b["class"]] = b

    material = None
    for name, b in best.items():
        kind, label = ROLE.get(name, ("unknown", name))
        if kind == "attachment":
            detections.append({"label": label, "confidence": round(b["confidence"], 3)})
        elif kind == "material" and (material is None or b["confidence"] > material["confidence"]):
            material = {"label": "Material", "value": label, "confidence": round(b["confidence"], 3)}
    if material:
        detections.append(material)

    # 2) OCR: read the tag boxes if YOLO found them, else the whole photo
    if OCR_ON:
        tag = best.get("pole_number_tag")
        if tag:
            pieces = read_text(crop(img, tag["xyxy"]))
            hit = find_pole_number(pieces)
            conf_scale = tag["confidence"]
        else:
            pieces = read_text(img)
            hit = find_pole_number(pieces)
            conf_scale = 0.8  # whole-photo reads are less trustworthy
        if hit:
            detections.insert(0, {"label": "Pole number", "value": hit[0], "confidence": round(hit[1] * conf_scale, 3)})
        elif _reader_error:
            warnings.append(_reader_error)
        else:
            warnings.append("Couldn't read a pole number. Type it in, or get closer to the stencil.")

        kva_box = best.get("kva_marking")
        if kva_box:
            k = find_kva(read_text(crop(img, kva_box["xyxy"])), from_tag=True)
            k_scale = kva_box["confidence"]
        else:
            k = find_kva(pieces, from_tag=False)
            k_scale = 0.8
        if k:
            detections.append({"label": "Transformer rating", "value": k[0], "confidence": round(k[1] * k_scale, 3)})

    return {
        "simulated": False,
        "modelLoaded": model is not None,
        "detections": detections,
        "boxes": boxes,
        "imageSize": [int(img.shape[1]), int(img.shape[0])],
        "warnings": warnings,
    }
