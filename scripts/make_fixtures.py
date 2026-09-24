"""Generate the conformance fixtures.

Run once: ``python scripts/make_fixtures.py``. The fixtures are small and committed to
Git, because clause 2.2.6's format requirements get a test rather than a mention and a
test with no fixtures is a mention.

Half the fixtures are **deliberately malformed**. A loader that only ever sees good
input has not been tested; what matters operationally is that a bad annotation file is
rejected with a reason rather than silently producing a detector result about data
nobody delivered.
"""

from __future__ import annotations

import json
from pathlib import Path

import torch

from pramana.ladder.models import SmallCNN

ROOT = Path(__file__).resolve().parent.parent
C = ROOT / "conformance"


def coco_fixtures() -> None:
    d = C / "coco"
    d.mkdir(parents=True, exist_ok=True)

    good = {
        "info": {"description": "PRAMANA conformance fixture: COCO with contributor provenance"},
        "licenses": [{"id": 1, "name": "CC-BY-4.0"}],
        "images": [
            {"id": 1, "file_name": "img_0001.png", "width": 64, "height": 64, "source_lot": "lot-04"},
            {"id": 2, "file_name": "img_0002.png", "width": 64, "height": 64, "source_lot": "lot-04"},
            {"id": 3, "file_name": "img_0003.png", "width": 64, "height": 64, "source_lot": "lot-07"},
        ],
        "annotations": [
            {"id": 1, "image_id": 1, "category_id": 14, "bbox": [8, 8, 20, 20], "area": 400, "iscrowd": 0},
            {"id": 2, "image_id": 2, "category_id": 2, "bbox": [4, 4, 30, 30], "area": 900, "iscrowd": 0},
            {"id": 3, "image_id": 3, "category_id": 14, "bbox": [1, 1, 10, 10], "area": 100, "iscrowd": 0},
        ],
        "categories": [{"id": 2, "name": "speed_50"}, {"id": 14, "name": "stop"}],
    }
    (d / "good_minimal.json").write_text(json.dumps(good, indent=2), encoding="utf-8")

    # Loads, but carries no provenance: the report must say has_provenance=False rather
    # than inventing a partition.
    no_prov = json.loads(json.dumps(good))
    for img in no_prov["images"]:
        img.pop("source_lot")
    (d / "good_no_provenance.json").write_text(json.dumps(no_prov, indent=2), encoding="utf-8")

    dangling = json.loads(json.dumps(good))
    dangling["annotations"].append(
        {"id": 4, "image_id": 999, "category_id": 2, "bbox": [0, 0, 1, 1], "area": 1, "iscrowd": 0}
    )
    (d / "bad_dangling_image_id.json").write_text(json.dumps(dangling, indent=2), encoding="utf-8")

    missing = json.loads(json.dumps(good))
    missing.pop("categories")
    (d / "bad_missing_categories.json").write_text(json.dumps(missing, indent=2), encoding="utf-8")

    (d / "bad_not_json.json").write_text("{ this is not json ,,,", encoding="utf-8")


def yolo_fixtures() -> None:
    d = C / "yolo"
    (d / "good_lot04").mkdir(parents=True, exist_ok=True)
    (d / "bad_coords").mkdir(parents=True, exist_ok=True)
    (d / "bad_fields").mkdir(parents=True, exist_ok=True)

    (d / "good_lot04" / "img_0001.txt").write_text("14 0.5 0.5 0.31 0.31\n2 0.2 0.2 0.1 0.1\n", encoding="utf-8")
    (d / "good_lot04" / "img_0002.txt").write_text("2 0.12 0.48 0.22 0.22\n", encoding="utf-8")
    (d / "good_lot04" / "classes.txt").write_text("speed_50\nstop\n", encoding="utf-8")

    # w = 1.40 is outside [0,1]: written against a pixel convention, not a normalised
    # one. Clamping it would turn a format error into a plausible-looking box.
    (d / "bad_coords" / "img_0003.txt").write_text("14 0.5 0.5 1.40 0.31\n", encoding="utf-8")
    (d / "bad_fields" / "img_0004.txt").write_text("14 0.5 0.5 0.3\n", encoding="utf-8")


def model_fixtures() -> None:
    d = C / "models"
    d.mkdir(parents=True, exist_ok=True)

    model = SmallCNN(n_classes=43).eval()
    scripted = torch.jit.script(model)
    scripted.save(str(d / "good_smallcnn.torchscript"))

    try:
        dummy = torch.randn(1, 3, 32, 32)
        torch.onnx.export(
            model,
            dummy,
            str(d / "good_smallcnn.onnx"),
            input_names=["input"],
            output_names=["logits"],
            dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
            opset_version=17,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"  (ONNX export skipped: {exc})")

    (d / "bad_truncated.pt").write_bytes(b"PK\x03\x04truncated-not-a-model")


def main() -> None:
    coco_fixtures()
    yolo_fixtures()
    model_fixtures()
    files = sorted(p for p in C.rglob("*") if p.is_file())
    total = sum(p.stat().st_size for p in files)
    print(f"wrote {len(files)} fixtures, {total / 1024:.1f} KiB total")
    for p in files:
        print(f"  {p.relative_to(ROOT).as_posix()}  ({p.stat().st_size} B)")


if __name__ == "__main__":
    main()
