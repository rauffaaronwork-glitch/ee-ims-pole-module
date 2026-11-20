"""Class list shared by training (data.yaml) and the detection service.

The order here IS the YOLO class id order. Don't reorder after you start
labeling, or old labels will point at the wrong class. Add new classes at the end.
"""

# (yolo class name, how it maps into the app)
#   ("attachment", "<Attachment label from src/lib/types.ts>")
#   ("material", "Concrete" | "Steel" | "Wood")   -> the pole body itself
#   ("ocr", "Pole number" | "Transformer rating")  -> a region to read with OCR
CLASSES: list[tuple[str, tuple[str, str]]] = [
    ("crossarm", ("attachment", "Crossarm")),
    ("pin_insulator", ("attachment", "Pin insulator")),
    ("suspension_insulator", ("attachment", "Suspension insulator")),
    ("fuse_cutout", ("attachment", "Fuse cutout")),
    ("lightning_arrester", ("attachment", "Lightning arrester")),
    ("distribution_transformer", ("attachment", "Distribution transformer")),
    ("streetlight", ("attachment", "Streetlight")),
    ("guy_wire", ("attachment", "Guy wire")),
    ("service_drop", ("attachment", "Service drop")),
    ("kwh_meter_cluster", ("attachment", "kWh meter cluster")),
    ("pole_concrete", ("material", "Concrete")),
    ("pole_steel", ("material", "Steel")),
    ("pole_wood", ("material", "Wood")),
    ("pole_number_tag", ("ocr", "Pole number")),
    ("kva_marking", ("ocr", "Transformer rating")),
]

NAMES = [name for name, _ in CLASSES]
ROLE = {name: role for name, role in CLASSES}
