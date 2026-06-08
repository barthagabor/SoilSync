#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from xgboost_recommender_core import (
    DEFAULT_CACHE_DIR,
    DEFAULT_COLLECTION,
    DEFAULT_DB_NAME,
    DEFAULT_MONGO_URI,
    build_cli_profile,
    build_summary,
    ensure_cached_bundle,
    rank_for_profile,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SoilSync XGBoost ranking demo (Mongo-backed, cached)")
    parser.add_argument("--mongo-uri", type=str, default=DEFAULT_MONGO_URI, help="Mongo connection URI")
    parser.add_argument("--database", type=str, default=DEFAULT_DB_NAME, help="Mongo database name")
    parser.add_argument("--collection", type=str, default=DEFAULT_COLLECTION, help="Mongo collection name")
    parser.add_argument("--queries", type=int, default=30, help="Number of synthetic training queries")
    parser.add_argument("--top-k", type=int, default=6, help="Number of recommendations to print")
    parser.add_argument("--limit-plants", type=int, default=None, help="Optional cap for quicker demo runs")
    parser.add_argument("--watering", type=str, default=None)
    parser.add_argument("--care-level", dest="care_level", type=str, default=None)
    parser.add_argument("--type", dest="plant_type", type=str, default=None)
    parser.add_argument("--cycle", type=str, default=None)
    parser.add_argument("--hardiness-zone", dest="hardiness_zone", type=int, default=None)
    parser.add_argument("--low-maintenance", action="store_true")
    parser.add_argument("--pet-safe", action="store_true")
    parser.add_argument("--medicinal", action="store_true")
    parser.add_argument("--refresh-cache", action="store_true", help="Force rebuilding the cached model bundle")
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR, help="Directory for cached artifacts")
    parser.add_argument("--save-model", type=Path, default=None, help="Optional path to copy the trained booster")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    try:
        bundle, cache_status = ensure_cached_bundle(
            mongo_uri=args.mongo_uri,
            database_name=args.database,
            collection_name=args.collection,
            queries_count=args.queries,
            limit_plants=args.limit_plants,
            cache_dir=args.cache_dir,
            force_refresh=args.refresh_cache,
        )
    except Exception as exc:
        print(
            json.dumps(
                {
                    "error": "Failed to prepare the cached XGBoost recommender bundle.",
                    "details": str(exc),
                    "mongo_uri": args.mongo_uri,
                    "database": args.database,
                    "collection": args.collection,
                    "cache_dir": str(args.cache_dir),
                },
                indent=2,
            )
        )
        sys.exit(1)

    if args.save_model:
        args.save_model.parent.mkdir(parents=True, exist_ok=True)
        bundle["booster"].save_model(str(args.save_model))

    plants = bundle.get("plants") or []
    profile = build_cli_profile(
        args,
        plants,
        default_profile=(bundle.get("metadata") or {}).get("default_profile"),
    )
    recommendations = rank_for_profile(
        booster=bundle["booster"],
        feature_columns=bundle["feature_columns"],
        plants=plants,
        profile=profile,
        top_k=max(1, args.top_k),
    )
    summary = build_summary(
        bundle=bundle,
        profile=profile,
        recommendations=recommendations,
        cache_dir=args.cache_dir,
        cache_status=cache_status,
    )

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
