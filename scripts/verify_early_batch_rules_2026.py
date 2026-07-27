#!/usr/bin/env python3
"""Validate the static 2026 Jiangsu early-batch rule and group-data contract."""

from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "early-batch" / "rules-2026.js",
    ROOT / "early-batch" / "data.js",
    ROOT / "early-batch" / "groups-2026.js",
    ROOT / "early-batch" / "app.js",
    ROOT / "early-batch" / "index.html",
    ROOT / "early-batch" / "styles.css",
    ROOT / "supabase" / "early_batch_integration.sql",
]


def fail(message: str) -> None:
    raise AssertionError(message)


def load_payload() -> dict:
    node = shutil.which("node")
    if not node:
        fail("node is required to validate early-batch JavaScript")
    script = r"""
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = process.argv[1];
const context = { window: {} };
vm.createContext(context);
for (const file of ['rules-2026.js', 'data.js', 'groups-2026.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'early-batch', file), 'utf8'), context, { filename: file });
}
process.stdout.write(JSON.stringify({
  rules: context.window.EARLY_BATCH_RULES_2026,
  guide: context.window.EARLY_BATCH_GUIDE_DATA,
  groupData: context.window.EARLY_BATCH_GROUPS_2026
}));
"""
    result = subprocess.run(
        [node, "-e", script, str(ROOT)],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def number_close(left: float, right: float) -> bool:
    return math.isclose(float(left), float(right), rel_tol=1e-10, abs_tol=1e-10)


def main() -> int:
    missing = [str(path.relative_to(ROOT)) for path in FILES if not path.is_file()]
    if missing:
        fail(f"missing early-batch assets: {', '.join(missing)}")

    payload = load_payload()
    rules = payload.get("rules") or {}
    guide = payload.get("guide") or {}
    group_data = payload.get("groupData") or {}

    for label, meta in (("rules", rules.get("meta")), ("guide", guide.get("meta")), ("groups", group_data.get("meta"))):
        if not isinstance(meta, dict):
            fail(f"{label}.meta must be an object")
        if meta.get("year") != 2026 or meta.get("province") != "江苏":
            fail(f"{label}.meta must preserve year=2026 and province=江苏")

    sources = rules.get("sources") or []
    categories = rules.get("categories") or []
    rule_rows = rules.get("rules") or []
    timeline = rules.get("timeline") or []
    conflicts = rules.get("conflicts") or []
    if len(sources) != 3:
        fail(f"expected 3 Markdown sources, got {len(sources)}")
    if len(categories) != 7:
        fail(f"expected 7 top categories, got {len(categories)}")
    if len(rule_rows) < 70 or len(timeline) < 19 or len(conflicts) < 17:
        fail("rule layer is unexpectedly incomplete")

    source_ids = {row.get("id") for row in sources}
    required_evidence = {"year", "province", "sourceId", "sourceType", "verificationStatus", "conflictGroup"}
    official_statuses = {"official_verified_2026", "verified_2026_official"}
    for collection_name, rows in (("rule", rule_rows), ("timeline", timeline)):
        seen: set[str] = set()
        for row in rows:
            row_id = row.get("id")
            if not row_id or row_id in seen:
                fail(f"{collection_name} id is missing or duplicated: {row_id}")
            seen.add(row_id)
            absent = required_evidence.difference(row)
            if absent:
                fail(f"{collection_name} {row_id} lacks evidence fields: {sorted(absent)}")
            if row.get("year") != 2026 or row.get("province") != "江苏":
                fail(f"{collection_name} {row_id} lost year/province scope")
            if row.get("sourceId") not in source_ids:
                fail(f"{collection_name} {row_id} references unknown sourceId")
            if row.get("verificationStatus") in official_statuses:
                fail(f"secondary source {collection_name} {row_id} must not be marked official")

    for conflict in conflicts:
        if not conflict.get("id") or len(conflict.get("claims") or []) < 2:
            fail("each conflict must contain an id and at least two claims")
        absent = required_evidence.difference(conflict)
        if absent:
            fail(f"conflict {conflict.get('id')} lacks evidence fields: {sorted(absent)}")

    groups = group_data.get("groups") or []
    meta = group_data.get("meta") or {}
    if len(groups) != 499 or meta.get("groupCount") != 499:
        fail(f"expected 499 groups, got {len(groups)}")
    if meta.get("majorCount") != 1687 or sum(len(row.get("majors") or []) for row in groups) != 1687:
        fail("expected exactly 1,687 major-detail rows")
    if meta.get("schoolCount") != 171:
        fail(f"expected 171 schools, got {meta.get('schoolCount')}")
    subject_counts = {subject: sum(row.get("subjectType") == subject for row in groups) for subject in ("物理类", "历史类")}
    if subject_counts != {"物理类": 353, "历史类": 146}:
        fail(f"unexpected subject counts: {subject_counts}")

    allowed_categories = {
        "1军校男", "1军校女", "2公安男", "2公安女", "3航海", "4地方专项",
        "5高校专项", "6医学定向", "7其他", "7其他男", "7其他女", "8综评A",
    }
    ids: set[str] = set()
    comparable_keys: set[tuple] = set()
    comprehensive_missing = 0
    score_only = 0
    for group in groups:
        group_id = group.get("id")
        if not group_id or group_id in ids:
            fail(f"group id is missing or duplicated: {group_id}")
        ids.add(group_id)
        code = str(group.get("code") or "")
        if not re.fullmatch(r"\d{6}", code):
            fail(f"invalid six-digit group code: {code}")
        if not str(group.get("groupName") or "").endswith(code[-2:]):
            fail(f"group-name suffix mismatch: {group_id}")
        if group.get("categoryRaw") not in allowed_categories:
            fail(f"unknown category: {group.get('categoryRaw')}")
        key = (group.get("subjectType"), group.get("categoryRaw"), group.get("school"), code)
        if key in comparable_keys:
            fail(f"duplicate comparable group row: {key}")
        comparable_keys.add(key)

        for field in ("score2026", "rank2026", "score2025", "rank2025", "score2024", "rank2024", "score2023", "rank2023"):
            value = group.get(field)
            if value == 0:
                fail(f"missing score/rank must be null, not zero: {group_id}.{field}")
        if group.get("score2026") is not None and group.get("score2025") is not None:
            expected = group["score2026"] - group["score2025"]
            if not number_close(group.get("scoreDelta"), expected):
                fail(f"wrong scoreDelta for {group_id}")
        elif group.get("scoreDelta") is not None:
            fail(f"scoreDelta must be null without comparable scores: {group_id}")
        if group.get("rank2026") is not None and group.get("rank2025") is not None:
            expected = group["rank2025"] - group["rank2026"]
            if not number_close(group.get("rankDelta"), expected):
                fail(f"wrong rankDelta for {group_id}")
        elif group.get("rankDelta") is not None:
            fail(f"rankDelta must be null without comparable ranks: {group_id}")
        if group.get("planDelta") != group.get("plan2026") - group.get("plan2025"):
            fail(f"wrong planDelta for {group_id}")

        separate = group.get("categoryId") in {"university-special", "comprehensive-a"}
        if bool(group.get("separateTrack")) != separate:
            fail(f"separate-batch flag is wrong for {group_id}")
        if group.get("categoryId") == "comprehensive-a" and group.get("score2026") is None and group.get("rank2026") is None:
            comprehensive_missing += 1
        if group.get("score2026") is not None and group.get("rank2026") is None:
            score_only += 1

    if comprehensive_missing != 23:
        fail(f"expected 23 comprehensive-A groups without score/rank, got {comprehensive_missing}")
    if score_only != 7:
        fail(f"expected 7 score-only groups, got {score_only}")

    index_text = (ROOT / "early-batch" / "index.html").read_text(encoding="utf-8")
    order = [index_text.find(name) for name in ("rules-2026.js", "data.js", "groups-2026.js", "app.js")]
    if min(order) < 0 or order != sorted(order):
        fail("early-batch scripts must load rules -> guide data -> groups -> app")
    app_text = (ROOT / "early-batch" / "app.js").read_text(encoding="utf-8")
    for required in (
        "student_early_batch_records", "save_student_early_batch", "js-plan-early-batch-draft-v1",
        "p_expected_updated_at", "baseCloudUpdatedAt", "baseKnown", "storageSchemaVersion:2",
        "QUALIFICATION_PROGRESS_STATUSES", "hasUnsafeMemoryConflict", "beforeunload",
        "downloadCurrentConflict", "downloadStoredConflicts", "同步冲突",
        "工作簿数据待2026官方复核", "不同口径，不表示涨跌",
    ):
        if required not in app_text:
            fail(f"app is missing persistence contract: {required}")
    if "qualificationChecks||{}).filter(Boolean)" in app_text:
        fail("readiness must not count every truthy qualification status as progress")
    for unsafe_label in ("2026 提前批专业组矩阵", "参考变化", "分数变化＝"):
        if unsafe_label in app_text:
            fail(f"app uses misleading cross-year label: {unsafe_label}")

    sql_text = (ROOT / "supabase" / "early_batch_integration.sql").read_text(encoding="utf-8")
    for required in (
        "p_expected_updated_at timestamptz", "pg_advisory_xact_lock",
        "changed by another user", "uuid, text, jsonb, timestamptz",
    ):
        if required not in sql_text:
            fail(f"SQL concurrency contract is incomplete: {required}")

    cache_contracts = {
        ROOT / "index.html": "app.js?v=20260727-inline-cutoff26-r1",
        ROOT / "students" / "index.html": "app.js?v=20260712-early-batch-r1",
        ROOT / "students" / "archive.html": "archive.js?v=20260712-early-batch-r1",
        ROOT / "early-batch" / "index.html": "app.js?v=20260712-early-batch-r2",
    }
    for path, token in cache_contracts.items():
        if token not in path.read_text(encoding="utf-8"):
            fail(f"stale cache-busting token in {path.relative_to(ROOT)}")

    print(
        "Early-batch validation passed: "
        f"{len(rule_rows)} rules, {len(timeline)} timeline nodes, {len(conflicts)} conflicts, "
        f"{len(groups)} groups / {meta.get('majorCount')} majors / {meta.get('schoolCount')} schools."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        print(f"Early-batch validation failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
