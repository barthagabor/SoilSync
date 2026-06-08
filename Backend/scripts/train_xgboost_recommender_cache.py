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
    ensure_cached_bundle,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train or refresh the cached SoilSync XGBoost bundle")
    parser.add_argument("--mongo-uri", type=str, default=DEFAULT_MONGO_URI, help="Mongo connection URI")
    parser.add_argument("--database", type=str, default=DEFAULT_DB_NAME, help="Mongo database name")
    parser.add_argument("--collection", type=str, default=DEFAULT_COLLECTION, help="Mongo collection name")
    parser.add_argument("--queries", type=int, default=30, help="Number of synthetic training queries")
    parser.add_argument("--limit-plants", type=int, default=None, help="Optional cap for quicker demo runs")
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR, help="Directory for cached artifacts")
    parser.add_argument("--force-refresh", action="store_true", help="Always rebuild the cached model bundle")
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
            force_refresh=args.force_refresh,
        )
    except Exception as exc:
        print(
            json.dumps(
                {
                    "error": "Failed to build the cached XGBoost bundle.",
                    "details": str(exc),
                    "cache_dir": str(args.cache_dir),
                },
                indent=2,
            )
        )
        sys.exit(1)

    metadata = bundle.get("metadata") or {}
    print(
        json.dumps(
            {
                "message": "XGBoost cache is ready.",
                "cache_status": cache_status,
                "cache_dir": str(args.cache_dir),
                "plants_loaded": metadata.get("plants_loaded"),
                "synthetic_queries": (metadata.get("training") or {}).get("queries"),
                "training_rows": (metadata.get("training") or {}).get("rows"),
                "created_at": metadata.get("created_at"),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
