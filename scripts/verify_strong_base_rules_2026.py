#!/usr/bin/env python3
"""Verify the source-aware contract in ``strong-base/rules-2026.js``.

The rules file is JavaScript so the static site can load it directly.  This
checker accepts a strict JSON assignment without Node.js and falls back to a
small, time-limited Node ``vm`` sandbox for ordinary JavaScript object syntax.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any


GLOBAL_NAME = "STRONG_BASE_RULES_2026"
EXPECTED_YEAR = 2026
EXPECTED_PROVINCE = "江苏"
EXPECTED_SCHOOL_COUNT = 39
EXPECTED_SOURCE_COUNT = 6
EXPECTED_SOURCE_IDS = {
    "source-2026-core",
    "source-guide",
    "source-interview",
    "source-trend",
    "source-choice",
    "source-national",
}
EXPECTED_SOURCE_TITLES = {
    "26年强基计划",
    "强基计划报考指南",
    "强基计划面试全攻略",
    "2026年强基计划新风向解读专项讲座结构化笔记",
    "26强基择校逻辑",
    "强基计划全国讲座",
}
REQUIRED_TOP_LEVEL = ("meta", "sources", "schools", "interviews")
REQUIRED_SCHOOL_FIELDS = (
    "id",
    "name",
    "jiangsuMajors",
    "verification",
    "entryRule",
    "testStage",
    "testMode",
    "formula",
    "multiplier",
    "transferPolicy",
    "riskNotes",
)
REQUIRED_VERIFICATION_FIELDS = (
    "status",
    "sourceType",
    "year",
    "province",
    "lastVerified",
    "sourceRefs",
)
EMPTY_MAJOR_STATUSES = {"blocked", "needs_official_plan"}
DATE_RE = re.compile(r"^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$")


NODE_LOADER = r"""
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(process.argv[1], 'utf8');
const sandbox = { window: {} };
sandbox.globalThis = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { timeout: 1500, filename: process.argv[1] });
const value = sandbox.window.STRONG_BASE_RULES_2026;
if (!value || typeof value !== 'object' || Array.isArray(value)) {
  throw new Error('window.STRONG_BASE_RULES_2026 must be an object');
}
process.stdout.write(JSON.stringify(value));
"""


def _strict_json_assignment(javascript: str) -> dict[str, Any] | None:
    marker = re.search(
        rf"(?:window|globalThis)\s*\.\s*{GLOBAL_NAME}\s*=\s*",
        javascript,
    )
    if not marker:
        raise ValueError(f"missing window.{GLOBAL_NAME} assignment")
    try:
        value, _ = json.JSONDecoder().raw_decode(javascript[marker.end() :])
    except json.JSONDecodeError:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"window.{GLOBAL_NAME} must be an object")
    return value


def load_rules(path: Path) -> dict[str, Any]:
    javascript = path.read_text(encoding="utf-8")
    strict = _strict_json_assignment(javascript)
    if strict is not None:
        return strict

    node = find_node()
    if not node:
        raise ValueError(
            "rules assignment is not strict JSON and Node.js is unavailable "
            "for sandboxed JavaScript parsing"
        )
    result = subprocess.run(
        [node, "-e", NODE_LOADER, str(path.resolve())],
        check=False,
        capture_output=True,
        text=True,
        timeout=3,
    )
    if result.returncode:
        detail = (result.stderr or result.stdout).strip().splitlines()
        raise ValueError(
            "could not evaluate rules file: " + (detail[-1] if detail else "unknown Node error")
        )
    value = json.loads(result.stdout)
    if not isinstance(value, dict):
        raise ValueError(f"window.{GLOBAL_NAME} must be an object")
    return value


def find_node() -> str | None:
    """Find either the shell Node.js or Codex's bundled workspace runtime."""

    candidates = [
        shutil.which("node"),
        os.environ.get("CODEX_NODE"),
        str(
            Path.home()
            / ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
        ),
    ]
    runtime_root = Path.home() / ".cache/codex-runtimes"
    if runtime_root.is_dir():
        candidates.extend(
            str(candidate)
            for candidate in runtime_root.glob("*/dependencies/node/bin/node")
        )
    for candidate in candidates:
        if candidate and Path(candidate).is_file() and os.access(candidate, os.X_OK):
            return candidate
    return None


def normalize_title(value: object) -> str:
    title = re.sub(r"\.md$", "", str(value or ""), flags=re.IGNORECASE)
    return re.sub(r"[\s·《》._—-]+", "", title)


def is_meaningful(value: object) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict, tuple)):
        return bool(value)
    return value is not None


def as_int(value: object) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def source_ref_id(value: object) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return str(value.get("sourceId") or value.get("id") or "").strip()
    return ""


def verify(rules: dict[str, Any]) -> tuple[list[str], list[str], dict[str, Any]]:
    errors: list[str] = []
    warnings: list[str] = []

    for key in REQUIRED_TOP_LEVEL:
        if key not in rules:
            errors.append(f"missing top-level key: {key}")

    meta = rules.get("meta")
    sources = rules.get("sources")
    schools = rules.get("schools")
    interviews = rules.get("interviews")
    if not isinstance(meta, dict):
        errors.append("meta must be an object")
        meta = {}
    if not isinstance(sources, list):
        errors.append("sources must be an array")
        sources = []
    if not isinstance(schools, list):
        errors.append("schools must be an array")
        schools = []
    if not isinstance(interviews, (list, dict)) or not interviews:
        errors.append("interviews must be a non-empty array or object")

    if as_int(meta.get("year")) != EXPECTED_YEAR:
        errors.append(f"meta.year must be {EXPECTED_YEAR}")
    if str(meta.get("province") or "").strip() != EXPECTED_PROVINCE:
        errors.append(f"meta.province must be {EXPECTED_PROVINCE}")
    if as_int(meta.get("schoolCount")) != EXPECTED_SCHOOL_COUNT:
        errors.append(f"meta.schoolCount must be {EXPECTED_SCHOOL_COUNT}")
    if as_int(meta.get("sourceCount")) != EXPECTED_SOURCE_COUNT:
        errors.append(f"meta.sourceCount must be {EXPECTED_SOURCE_COUNT}")
    disclaimer = str(meta.get("officialDisclaimer") or meta.get("disclaimer") or "").strip()
    if not disclaimer or "官方" not in disclaimer or "简章" not in disclaimer:
        errors.append("meta disclaimer must say that official 2026 brochures require final verification")

    if len(sources) != EXPECTED_SOURCE_COUNT:
        errors.append(f"sources: expected {EXPECTED_SOURCE_COUNT}, got {len(sources)}")
    source_ids: list[str] = []
    source_titles: set[str] = set()
    object_source_count = 0
    for index, source in enumerate(sources):
        label = f"sources[{index}]"
        if isinstance(source, str):
            source_id = source.strip()
            title = ""
        elif isinstance(source, dict):
            object_source_count += 1
            source_id = str(source.get("id") or "").strip()
            title = normalize_title(source.get("title"))
        else:
            errors.append(f"{label} must be a source id or source object")
            continue
        if not source_id:
            errors.append(f"{label}.id is required")
        else:
            source_ids.append(source_id)
        if isinstance(source, dict) and not title:
            errors.append(f"{label}.title is required")
        elif title:
            source_titles.add(title)
    duplicate_source_ids = sorted(
        key for key, count in Counter(source_ids).items() if count > 1
    )
    if duplicate_source_ids:
        errors.append(f"duplicate source ids: {', '.join(duplicate_source_ids)}")
    missing_source_ids = sorted(EXPECTED_SOURCE_IDS - set(source_ids))
    unexpected_source_ids = sorted(set(source_ids) - EXPECTED_SOURCE_IDS)
    if missing_source_ids:
        errors.append(f"missing source ids: {', '.join(missing_source_ids)}")
    if unexpected_source_ids:
        errors.append(f"unexpected source ids: {', '.join(unexpected_source_ids)}")
    if object_source_count:
        missing_titles = sorted(EXPECTED_SOURCE_TITLES - source_titles)
        unexpected_titles = sorted(source_titles - EXPECTED_SOURCE_TITLES)
        if missing_titles:
            errors.append(f"missing source originals: {', '.join(missing_titles)}")
        if unexpected_titles:
            errors.append(f"unexpected source titles: {', '.join(unexpected_titles)}")

    if len(schools) != EXPECTED_SCHOOL_COUNT:
        errors.append(f"schools: expected {EXPECTED_SCHOOL_COUNT}, got {len(schools)}")
    known_source_ids = set(source_ids)
    school_ids: list[str] = []
    school_names: list[str] = []
    referenced_source_ids: set[str] = set()
    national_defense_schools: list[dict[str, Any]] = []

    for index, school in enumerate(schools):
        label = f"schools[{index}]"
        if not isinstance(school, dict):
            errors.append(f"{label} must be an object")
            continue
        name = str(school.get("name") or "").strip()
        school_id = str(school.get("id") or "").strip()
        label = f"school {name or index}"
        if school_id:
            school_ids.append(school_id)
        if name:
            school_names.append(name)
        if "国防科技大学" in name:
            national_defense_schools.append(school)

        for key in REQUIRED_SCHOOL_FIELDS:
            if key not in school:
                errors.append(f"{label}: missing {key}")
        if not school_id:
            errors.append(f"{label}: id is required")
        if not name:
            errors.append(f"{label}: name is required")

        for key in (
            "entryRule",
            "testStage",
            "testMode",
            "formula",
            "multiplier",
            "transferPolicy",
        ):
            if not is_meaningful(school.get(key)):
                errors.append(f"{label}: {key} must contain a value or explicit verification note")

        risk_notes = school.get("riskNotes")
        if not isinstance(risk_notes, list) or not risk_notes or not all(
            isinstance(item, str) and item.strip() for item in risk_notes
        ):
            errors.append(f"{label}: riskNotes must be a non-empty string array")

        majors = school.get("jiangsuMajors")
        if not isinstance(majors, list):
            errors.append(f"{label}: jiangsuMajors must be an array")
            majors = []
        for major_index, major in enumerate(majors):
            if isinstance(major, str):
                valid_major = bool(major.strip())
            elif isinstance(major, dict):
                valid_major = bool(str(major.get("name") or "").strip())
            else:
                valid_major = False
            if not valid_major:
                errors.append(f"{label}: jiangsuMajors[{major_index}] needs a name")

        verification = school.get("verification")
        if not isinstance(verification, dict):
            errors.append(f"{label}: verification must be an object")
            verification = {}
        for key in REQUIRED_VERIFICATION_FIELDS:
            if key not in verification:
                errors.append(f"{label}: verification.{key} is required")
        status = str(verification.get("status") or "").strip()
        if not status:
            errors.append(f"{label}: verification.status is required")
        if not str(verification.get("sourceType") or "").strip():
            errors.append(f"{label}: verification.sourceType is required")
        if as_int(verification.get("year")) != EXPECTED_YEAR:
            errors.append(f"{label}: verification.year must be {EXPECTED_YEAR}")
        if str(verification.get("province") or "").strip() != EXPECTED_PROVINCE:
            errors.append(f"{label}: verification.province must be {EXPECTED_PROVINCE}")
        last_verified = str(verification.get("lastVerified") or "").strip()
        if not DATE_RE.fullmatch(last_verified):
            errors.append(f"{label}: verification.lastVerified must be YYYY-MM-DD")
        refs = verification.get("sourceRefs")
        if not isinstance(refs, list) or not refs:
            errors.append(f"{label}: verification.sourceRefs must be a non-empty array")
            refs = []
        for ref_index, ref in enumerate(refs):
            ref_id = source_ref_id(ref)
            if not ref_id:
                errors.append(f"{label}: sourceRefs[{ref_index}] needs a sourceId")
            elif ref_id not in known_source_ids:
                errors.append(f"{label}: unknown source reference {ref_id}")
            else:
                referenced_source_ids.add(ref_id)

        if not majors and status not in EMPTY_MAJOR_STATUSES:
            errors.append(
                f"{label}: empty Jiangsu majors require verification.status "
                "blocked or needs_official_plan"
            )

    duplicate_school_ids = sorted(
        key for key, count in Counter(school_ids).items() if count > 1
    )
    duplicate_school_names = sorted(
        key for key, count in Counter(school_names).items() if count > 1
    )
    if duplicate_school_ids:
        errors.append(f"duplicate school ids: {', '.join(duplicate_school_ids)}")
    if duplicate_school_names:
        errors.append(f"duplicate school names: {', '.join(duplicate_school_names)}")

    if len(national_defense_schools) != 1:
        errors.append("schools must contain exactly one 国防科技大学 record")
    else:
        defense = national_defense_schools[0]
        verification = defense.get("verification")
        defense_status = verification.get("status") if isinstance(verification, dict) else None
        if defense_status != "blocked":
            errors.append("国防科技大学 verification.status must be blocked")
        if defense.get("recommendable") is not False:
            errors.append("国防科技大学 recommendable must be false")

    unreferenced_sources = sorted(known_source_ids - referenced_source_ids)
    if unreferenced_sources:
        warnings.append(
            "sources not referenced by a school verification record: "
            + ", ".join(unreferenced_sources)
        )

    actual = {
        "sourceCount": len(sources),
        "schoolCount": len(schools),
        "interviewCollectionType": type(interviews).__name__,
        "referencedSourceCount": len(referenced_source_ids),
    }
    return errors, warnings, actual


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--rules-js",
        type=Path,
        default=Path("strong-base/rules-2026.js"),
        help="JavaScript rules file (default: strong-base/rules-2026.js)",
    )
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    try:
        rules = load_rules(args.rules_js)
        errors, warnings, actual = verify(rules)
    except (OSError, ValueError, json.JSONDecodeError, subprocess.TimeoutExpired) as exc:
        errors = [str(exc)]
        warnings = []
        actual = {}

    report = {
        "ok": not errors,
        "file": str(args.rules_js),
        "expected": {
            "global": f"window.{GLOBAL_NAME}",
            "year": EXPECTED_YEAR,
            "province": EXPECTED_PROVINCE,
            "sourceCount": EXPECTED_SOURCE_COUNT,
            "schoolCount": EXPECTED_SCHOOL_COUNT,
        },
        "actual": actual,
        "warnings": warnings,
        "errors": errors,
    }
    output = json.dumps(report, ensure_ascii=False, indent=2)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output + "\n", encoding="utf-8")
    print(output)
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
