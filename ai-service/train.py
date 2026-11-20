"""Train the pole-parts YOLO model and install it for the service.

Usage:
  python train.py --data path/to/data.yaml            # Roboflow "YOLOv11" export
  python train.py --data path/to/data.yaml --epochs 150 --model yolo11s.pt

It checks the dataset's class names against classes.py, trains, then copies
the best weights to models/pole-yolo.pt (where app.py looks for them).
Restart the service afterwards to load the new model.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import yaml

from classes import NAMES

HERE = Path(__file__).parent


def dataset_names(data_yaml: Path) -> list[str]:
    cfg = yaml.safe_load(data_yaml.read_text(encoding="utf-8"))
    names = cfg.get("names", [])
    return list(names.values()) if isinstance(names, dict) else list(names)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--data", required=True, type=Path, help="data.yaml from your labeled dataset")
    p.add_argument("--model", default="yolo11n.pt", help="starting weights (yolo11n.pt is small and fast; yolo11s.pt is more accurate)")
    p.add_argument("--epochs", type=int, default=100)
    p.add_argument("--imgsz", type=int, default=960, help="bigger helps with small parts like insulators")
    p.add_argument("--batch", type=int, default=8)
    p.add_argument("--device", default=None, help='"cpu", "0" for the first GPU; default picks automatically')
    args = p.parse_args()

    data = args.data.resolve()
    if not data.exists():
        sys.exit(f"Not found: {data}")

    names = dataset_names(data)
    unknown = [n for n in names if n not in NAMES]
    missing = [n for n in NAMES if n not in names]
    if unknown:
        sys.exit(
            "These dataset classes aren't in classes.py, so the app wouldn't know what they are:\n  "
            + ", ".join(unknown)
            + "\nRename them in Roboflow to match classes.txt, or add them to classes.py."
        )
    if missing:
        print("Note: no labels for these classes yet, so the model won't detect them:\n  " + ", ".join(missing))

    from ultralytics import YOLO

    model = YOLO(args.model)
    results = model.train(
        data=str(data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=str(HERE / "runs"),
        name="pole",
        exist_ok=False,
        patience=30,
        # field photos: keep colour/flip augmentation, but don't flip vertically (poles stand up)
        fliplr=0.5,
        flipud=0.0,
    )

    best = Path(results.save_dir) / "weights" / "best.pt"
    out = HERE / "models" / "pole-yolo.pt"
    out.parent.mkdir(exist_ok=True)
    if out.exists():
        backup = out.with_name("pole-yolo.previous.pt")
        shutil.copy2(out, backup)
        print(f"Kept the old model as {backup}")
    shutil.copy2(best, out)
    print(f"\nInstalled {best} -> {out}")
    print(f"Accuracy charts and the confusion matrix are in {results.save_dir}")
    print("Restart the service to use the new model.")


if __name__ == "__main__":
    main()
