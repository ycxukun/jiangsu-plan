#!/usr/bin/env python3
"""Verify the generated catalog and optionally compare it with MOE PDF text."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path


EXPECTED = {
    "disciplineCount": 13,
    "categoryCount": 92,
    "majorCount": 883,
    "directCrossDisciplineCount": 15,
}


def load_catalog(path: Path) -> tuple[dict[str, object], list[dict[str, object]]]:
    javascript = path.read_text(encoding="utf-8")
    meta_marker = "window.MAJOR_CATALOG_2026_META = "
    catalog_marker = "window.MAJOR_CATALOG_2026 = "
    meta_start = javascript.index(meta_marker) + len(meta_marker)
    meta_end = javascript.index(";\n\n", meta_start)
    catalog_start = javascript.index(catalog_marker) + len(catalog_marker)
    catalog_end = javascript.index(";\n}());", catalog_start)
    return json.loads(javascript[meta_start:meta_end]), json.loads(javascript[catalog_start:catalog_end])


def parse_official_text(path: Path) -> dict[str, str]:
    records: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^\s*(\d{6,7}[TK]{0,2})\s+(.+?)\s*$", line)
        if not match:
            continue
        name = match.group(2).split("（注：", 1)[0].strip()
        records[match.group(1)] = name
    return records


def verify(meta: dict[str, object], records: list[dict[str, object]]) -> list[str]:
    errors: list[str] = []
    codes = [str(record.get("code", "")) for record in records]
    ids = [str(record.get("id", "")) for record in records]
    duplicate_codes = sorted(code for code, count in Counter(codes).items() if count > 1)
    duplicate_ids = sorted(item for item, count in Counter(ids).items() if count > 1)
    discipline_codes = {str(record.get("disciplineCode", "")) for record in records if record.get("disciplineCode")}
    category_codes = {str(record.get("categoryCode", "")) for record in records if record.get("categoryCode")}
    direct = [record for record in records if not record.get("categoryCode")]

    actual = {
        "disciplineCount": len(discipline_codes),
        "categoryCount": len(category_codes),
        "majorCount": len(records),
        "directCrossDisciplineCount": len(direct),
    }
    for key, expected in EXPECTED.items():
        if actual[key] != expected:
            errors.append(f"{key}: expected {expected}, got {actual[key]}")
        if int(meta.get(key, -1)) != expected:
            errors.append(f"metadata {key}: expected {expected}, got {meta.get(key)}")
    if duplicate_codes:
        errors.append(f"duplicate codes: {', '.join(duplicate_codes[:20])}")
    if duplicate_ids:
        errors.append(f"duplicate ids: {', '.join(duplicate_ids[:20])}")

    for record in records:
        code = str(record.get("code", ""))
        name = str(record.get("name", "")).strip()
        discipline_code = str(record.get("disciplineCode", ""))
        category_code = str(record.get("categoryCode", ""))
        if not code or not name or not discipline_code or not record.get("discipline"):
            errors.append(f"missing identity field: {code or '<blank>'}")
            continue
        if not code.startswith(discipline_code):
            errors.append(f"discipline mismatch: {code} -> {discipline_code}")
        if category_code and not code.startswith(category_code):
            errors.append(f"category mismatch: {code} -> {category_code}")
        if not category_code and discipline_code != "14":
            errors.append(f"unexpected direct major: {code}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog-js", type=Path, required=True)
    parser.add_argument("--official-text", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    meta, records = load_catalog(args.catalog_js)
    errors = verify(meta, records)
    official_result: dict[str, object] | None = None
    if args.official_text:
        official = parse_official_text(args.official_text)
        generated = {str(record["code"]): str(record["name"]) for record in records}
        missing = sorted(set(official) - set(generated))
        extra = sorted(set(generated) - set(official))
        mismatches = [
            {"code": code, "official": official[code], "generated": generated[code]}
            for code in sorted(set(official) & set(generated))
            if official[code] != generated[code]
        ]
        official_result = {
            "officialCount": len(official),
            "generatedCount": len(generated),
            "missingCodes": missing,
            "extraCodes": extra,
            "nameMismatches": mismatches,
        }
        if len(official) != EXPECTED["majorCount"]:
            errors.append(f"official text parsed {len(official)} majors instead of 883")
        if missing or extra or mismatches:
            errors.append("generated catalog differs from official PDF text")

    report = {
        "ok": not errors,
        "expected": EXPECTED,
        "metadata": meta,
        "officialComparison": official_result,
        "errors": errors,
    }
    output = json.dumps(report, ensure_ascii=False, indent=2)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output, encoding="utf-8")
    print(output)
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
