#!/usr/bin/env python3
"""Normalisasi & pembanding snapshot JSON golden untuk scripts/ec-v2/golden.sh.

golden.sh memanggil skrip ini lewat dua subperintah:
  normalize <raw_dir> <out_dir>   gabungkan pasangan <nama>.status/<nama>.body
                                   di raw_dir jadi {"http_status", "body"},
                                   hapus field volatil, tulis <nama>.json ke out_dir.
  diff <golden_dir> <candidate_dir>  bandingkan file *.json yang sudah dinormalisasi;
                                       exit 0 bila 0 selisih, 1 bila ada.
"""
import difflib
import json
import sys
from pathlib import Path
from typing import Any

VOLATILE_KEY_SUFFIXES = ("_at",)
VOLATILE_KEYS = {"token", "snap_token", "access_token", "refresh_token"}
NORMALIZED_MARKER = "<normalized>"


def normalize(value: Any) -> Any:
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if k in VOLATILE_KEYS or k.endswith(VOLATILE_KEY_SUFFIXES):
                out[k] = NORMALIZED_MARKER
            else:
                out[k] = normalize(v)
        return out
    if isinstance(value, list):
        return [normalize(v) for v in value]
    return value


def cmd_normalize(raw_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    status_files = sorted(raw_dir.glob("*.status"))
    if not status_files:
        raise SystemExit(f"tidak ada *.status di {raw_dir}")
    for status_file in status_files:
        name = status_file.stem
        body_file = raw_dir / f"{name}.body"
        if not body_file.exists():
            raise SystemExit(f"{body_file} tidak ditemukan untuk {status_file}")
        http_status = int(status_file.read_text(encoding="utf-8").strip())
        body_text = body_file.read_text(encoding="utf-8")
        if body_text.strip() == "":
            body: Any = None
        else:
            try:
                body = json.loads(body_text)
            except json.JSONDecodeError:
                body = {"_raw_text": body_text}
        wrapped = {"http_status": http_status, "body": body}
        normalized = normalize(wrapped)
        out_file = out_dir / f"{name}.json"
        with out_file.open("w", encoding="utf-8", newline="\n") as f:
            json.dump(normalized, f, indent=2, ensure_ascii=False, sort_keys=True)
            f.write("\n")


def cmd_diff(golden_dir: Path, candidate_dir: Path) -> int:
    golden_files = {p.name for p in golden_dir.glob("*.json")}
    candidate_files = {p.name for p in candidate_dir.glob("*.json")}
    report: list[str] = []

    for name in sorted(golden_files - candidate_files):
        report.append(f"HILANG: {name} ada di golden tapi tidak tercapture sekarang")
    for name in sorted(candidate_files - golden_files):
        report.append(f"BARU: {name} tercapture sekarang tapi tidak ada di golden")

    changed = 0
    for name in sorted(golden_files & candidate_files):
        g_text = (golden_dir / name).read_text(encoding="utf-8")
        c_text = (candidate_dir / name).read_text(encoding="utf-8")
        if g_text != c_text:
            changed += 1
            report.append(f"BEDA: {name}")
            diff = difflib.unified_diff(
                g_text.splitlines(keepends=True),
                c_text.splitlines(keepends=True),
                fromfile=f"golden/{name}",
                tofile=f"candidate/{name}",
            )
            report.append("".join(diff))

    total = changed + len(golden_files ^ candidate_files)
    if report:
        print("\n".join(report))
        print(f"\n{total} selisih ditemukan.")
        return 1
    print("0 selisih.")
    return 0


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__, file=sys.stderr)
        return 2
    action, a, b = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    if action == "normalize":
        cmd_normalize(a, b)
        return 0
    if action == "diff":
        return cmd_diff(a, b)
    print(f"aksi tidak dikenal: {action}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
