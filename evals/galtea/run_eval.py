"""Galtea evaluation of the Evac Caller coordinator bot.

What it does: uploads `dataset.csv` (10 hand-written test cases) to Galtea, asks the real bot
every question through `pnpm ask` (same prompt, same Nebius model, same places_at_risk tool as the
Telegram bot), logs each answer as a Galtea trace and scores it with Galtea metrics.

The questions target the failure the plan names: an evacuation assistant that either invents facts
or refuses to answer (the Cal Fire chatbot problem).

Run:
    .venv-galtea/bin/python evals/galtea/run_eval.py --version coordinator-v4

Needs GALTEA_API_KEY in .env and a product created in the Galtea dashboard (the SDK cannot
create products). Results are written to docs/evidence/galtea/<version>.json.
"""

import argparse
import csv
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATASET_CSV = Path(__file__).with_name("dataset.csv")
EVIDENCE = ROOT / "docs" / "evidence" / "galtea"
# Metrics from the Galtea library. Factual Accuracy compares the answer with expected_output.
METRICS = ["Factual Accuracy", "Answer Relevancy"]


def env_from_dotenv(name: str) -> str | None:
    """Read one variable from .env, so this script needs no extra dependency."""
    value = os.environ.get(name)
    if value:
        return value
    dotenv = ROOT / ".env"
    if not dotenv.exists():
        return None
    for line in dotenv.read_text().splitlines():
        key, _, raw = line.partition("=")
        if key.strip() == name:
            return raw.strip().strip("'\"") or None
    return None


def prompt_version() -> str:
    source = (ROOT / "apps/agent/src/bot/prompt.ts").read_text()
    match = re.search(r'BOT_PROMPT_VERSION = "([^"]+)"', source)
    if not match:
        sys.exit("Could not read BOT_PROMPT_VERSION from apps/agent/src/bot/prompt.ts")
    return match.group(1)


def ask_the_bot(questions: list[str]) -> list[dict]:
    """Run the real coordinator agent once per question. Returns [{question, answer, ms, ...}]."""
    print(f"asking the bot {len(questions)} questions ...", flush=True)
    result = subprocess.run(
        ["pnpm", "--silent", "ask"],
        cwd=ROOT,
        input=json.dumps(questions),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        sys.exit(f"pnpm ask failed:\n{result.stderr}")
    return json.loads(result.stdout)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--product", default="Evac Caller", help="product name in the Galtea dashboard")
    parser.add_argument("--version", default=None, help="version name (default: the bot prompt version)")
    parser.add_argument("--dataset", default=None, help="dataset name in Galtea (default: evac-caller-grounding)")
    args = parser.parse_args()

    api_key = env_from_dotenv("GALTEA_API_KEY")
    if not api_key:
        sys.exit("GALTEA_API_KEY is empty. Put it in .env (it is git-ignored).")

    from galtea import Galtea  # imported here so --help works without the SDK

    galtea = Galtea(api_key=api_key, suppress_updatable_version_message=True)

    version_name = args.version or prompt_version()
    dataset_name = args.dataset or "evac-caller-grounding"

    product = galtea.products.get_by_name(name=args.product)
    if not product:
        sys.exit(
            f"No Galtea product named {args.product!r}. Create it at https://platform.galtea.ai "
            "(the SDK cannot create products), then run this again."
        )
    print(f"product {product.name} ({product.id})")

    version = galtea.versions.get_by_name(product_id=product.id, version_name=version_name)
    if not version:
        version = galtea.versions.create(
            product_id=product.id,
            name=version_name,
            description="Evac Caller coordinator bot on Telegram (Mastra agent, Nebius model)",
            system_prompt=(ROOT / "apps/agent/src/bot/prompt.ts").read_text(),
            model_id=os.environ.get("NEBIUS_MODEL", "deepseek-ai/DeepSeek-V4-Flash-0731"),
        )
    print(f"version {version.name} ({version.id})")

    dataset = galtea.datasets.get_by_name(product_id=product.id, dataset_name=dataset_name)
    if not dataset:
        dataset = galtea.datasets.create(
            name=dataset_name,
            type="ACCURACY",
            product_id=product.id,
            dataset_file_path=str(DATASET_CSV),
        )
        print("uploaded dataset, waiting for the test cases ...")
    test_cases = []
    for _ in range(30):
        test_cases = galtea.test_cases.list(dataset_id=dataset.id, limit=100)
        if test_cases:
            break
        time.sleep(2)
    if not test_cases:
        sys.exit(f"Dataset {dataset.id} has no test cases yet. Check the Galtea dashboard.")
    print(f"dataset {dataset.name} ({dataset.id}): {len(test_cases)} test cases")

    answers = {a["question"]: a for a in ask_the_bot([tc.input for tc in test_cases])}

    rows, evaluation_ids = [], []
    for test_case in test_cases:
        answer = answers[test_case.input]
        session = galtea.sessions.create(version_id=version.id, test_case_id=test_case.id)
        _, evaluations = galtea.traces.create_and_evaluate(
            session_id=session.id,
            input=test_case.input,
            output=answer["answer"],
            latency=answer["ms"] / 1000,
            metrics=METRICS,
        )
        evaluation_ids += [e.id for e in evaluations]
        rows.append(
            {
                "input": test_case.input,
                "expected_output": test_case.expected_output,
                "answer": answer["answer"],
                "ms": answer["ms"],
                "session_id": session.id,
                "evaluation_ids": [e.id for e in evaluations],
            }
        )
    print(f"logged {len(rows)} traces, waiting for {len(evaluation_ids)} evaluations ...")

    scored = galtea.evaluations.wait_for(evaluation_ids=evaluation_ids, timeout=600)
    by_id = {e.id: e for e in scored}
    metric_names = {}
    for row in rows:
        row["scores"] = []
        for evaluation_id in row["evaluation_ids"]:
            evaluation = by_id.get(evaluation_id)
            if not evaluation:
                continue
            if evaluation.metric_id not in metric_names:
                metric = galtea.metrics.get(evaluation.metric_id)
                metric_names[evaluation.metric_id] = metric.name if metric else evaluation.metric_id
            row["scores"].append(
                {
                    "metric": metric_names[evaluation.metric_id],
                    "score": evaluation.score,
                    "reason": evaluation.reason,
                }
            )

    per_metric: dict[str, list[float]] = {}
    for row in rows:
        for score in row["scores"]:
            if score["score"] is not None:
                per_metric.setdefault(score["metric"], []).append(score["score"])
    summary = {name: round(sum(v) / len(v), 3) for name, v in per_metric.items() if v}

    EVIDENCE.mkdir(parents=True, exist_ok=True)
    report = {
        "run_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "product": {"name": product.name, "id": product.id},
        "version": {"name": version.name, "id": version.id},
        "dataset": {"name": dataset.name, "id": dataset.id},
        "model": answers[test_cases[0].input]["model"],
        "metrics": METRICS,
        "average_scores": summary,
        "cases": rows,
    }
    out = EVIDENCE / f"{version_name}.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print("\naverage scores:")
    for name, value in summary.items():
        print(f"  {name}: {value}")
    print("\nlowest scoring cases:")
    worst = sorted(
        ((min((s["score"] for s in r["scores"] if s["score"] is not None), default=1.0), r) for r in rows),
        key=lambda pair: pair[0],
    )
    for score, row in worst[:3]:
        print(f"  {score}  {row['input']}")
    print(f"\nreport: {out}")


if __name__ == "__main__":
    main()
