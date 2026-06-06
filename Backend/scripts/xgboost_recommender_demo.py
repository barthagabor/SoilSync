#!/usr/bin/env python3
"""
Standalone Mongo-backed XGBoost ranking demo for SoilSync.

This script:
1. Loads raw plants directly from MongoDB (Perenual_Plants).
2. Normalizes plant attributes only inside this script.
3. Builds synthetic garden-profile queries.
4. Generates pseudo relevance labels for training.
5. Trains an XGBoost learning-to-rank model.
6. Scores all plants for one profile and prints the top matches.

Important:
- This does NOT modify the database.
- This does NOT integrate with the web app.
- Normalization happens only in the model feature layer.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np
import pandas as pd

try:
    import xgboost as xgb
except ImportError as exc:
    print(
        json.dumps(
            {
                "error": "xgboost is not installed for this Python environment.",
                "hint": "Install it first with: pip install xgboost",
                "details": str(exc),
            },
            indent=2,
        )
    )
    sys.exit(1)

try:
    from pymongo import MongoClient
except ImportError as exc:
    print(
        json.dumps(
            {
                "error": "pymongo is not installed for this Python environment.",
                "hint": "Install it first with: pip install pymongo",
                "details": str(exc),
            },
            indent=2,
        )
    )
    sys.exit(1)


RANDOM_SEED = 42
DEFAULT_MONGO_URI = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017/soilsync")
DEFAULT_DB_NAME = os.environ.get("MONGO_DB_NAME", "soilsync")
DEFAULT_COLLECTION = os.environ.get("MONGO_COLLECTION", "Perenual_Plants")

SUPPORTED_PREFS = (
    "watering",
    "care_level",
    "type",
    "cycle",
    "hardiness_zone",
    "low_maintenance",
    "pet_safe",
    "medicinal",
)


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def normalize_watering(value: Any) -> str:
    text = (normalize_text(value) or "").lower()
    if "frequent" in text:
        return "Frequent"
    if "minimum" in text or "low" in text:
        return "Minimum"
    if "average" in text or "regular" in text or "medium" in text:
        return "Average"
    return "Unknown"


def normalize_care_level(value: Any) -> str:
    text = (normalize_text(value) or "").lower()
    if text in {"easy", "low"} or "easy" in text or "low" in text:
        return "Low"
    if text in {"moderate", "medium"} or "moderate" in text or "medium" in text:
        return "Medium"
    if "high" in text:
        return "High"
    return "Unknown"


def normalize_maintenance(value: Any) -> str:
    text = (normalize_text(value) or "").lower()
    if "low" in text:
        return "Low"
    if "moderate" in text or "medium" in text:
        return "Moderate"
    if "high" in text:
        return "High"
    return "Unknown"


def normalize_cycle(value: Any) -> str:
    text = (normalize_text(value) or "").lower()
    if "annual" in text:
        return "Annual"
    if "biennial" in text:
        return "Biennial"
    if "perennial" in text:
        return "Perennial"
    return "Unknown"


def normalize_type(value: Any) -> str:
    text = (normalize_text(value) or "").lower()
    if not text:
        return "Unknown"
    if "tree" in text:
        return "Tree"
    if "shrub" in text or "bush" in text:
        return "Shrub"
    if "fern" in text:
        return "Fern"
    if "grass" in text or "sedge" in text or "rush" in text:
        return "Grass or Sedge"
    if "vine" in text or "climber" in text or "creeper" in text:
        return "Vine"
    if "succulent" in text:
        return "Succulent"
    if "cactus" in text:
        return "Cactus"
    if "palm" in text:
        return "Palm"
    if "orchid" in text:
        return "Orchid"
    if "herb" in text:
        return "Herb"
    if "flower" in text or "daisy" in text or "dahlia" in text or "begonia" in text:
        return "Flower"
    if "fruit" in text or "vegetable" in text:
        return "Edible"
    if "aquatic" in text:
        return "Aquatic"
    return normalize_text(value) or "Unknown"


def parse_float(value: Any) -> float:
    if value is None:
        return float("nan")
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return float("nan")


def parse_zone_int(value: Any) -> int | None:
    try:
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return None
        return int(float(value))
    except (TypeError, ValueError):
        return None


def extract_primary_scientific_name(value: Any) -> str:
    if isinstance(value, list) and value:
        return normalize_text(value[0]) or "Unknown"
    return normalize_text(value) or "Unknown"


def extract_has_image(document: Dict[str, Any]) -> int:
    default_image = document.get("default_image") or {}
    return int(
        any(
            default_image.get(key)
            for key in ("regular_url", "medium_url", "small_url", "thumbnail", "original_url")
        )
    )


def extract_image_url(document: Dict[str, Any]) -> str | None:
    default_image = document.get("default_image") or {}
    return (
        normalize_text(default_image.get("regular_url"))
        or normalize_text(default_image.get("medium_url"))
        or normalize_text(default_image.get("small_url"))
        or normalize_text(default_image.get("thumbnail"))
        or normalize_text(default_image.get("original_url"))
    )


def load_plants_from_mongo(
    mongo_uri: str,
    database_name: str,
    collection_name: str,
    limit: int | None = None,
) -> List[Dict[str, Any]]:
    client = MongoClient(mongo_uri)
    try:
        collection = client[database_name][collection_name]
        projection = {
            "id": 1,
            "common_name": 1,
            "scientific_name": 1,
            "default_image": 1,
            "details.type": 1,
            "details.growth_rate": 1,
            "details.care_level": 1,
            "details.maintenance": 1,
            "details.cycle": 1,
            "details.watering": 1,
            "details.hardiness.min": 1,
            "details.hardiness.max": 1,
            "details.toxicity.pets": 1,
            "details.medicinal": 1,
        }

        cursor = collection.find({}, projection=projection)
        if limit and limit > 0:
            cursor = cursor.limit(limit)

        plants: List[Dict[str, Any]] = []
        for raw in cursor:
            details = raw.get("details") or {}
            hardiness = details.get("hardiness") or {}
            toxicity = details.get("toxicity") or {}

            plant = {
                "id": raw.get("id"),
                "common_name": normalize_text(raw.get("common_name")) or "Unknown",
                "latin_name": extract_primary_scientific_name(raw.get("scientific_name")),
                "image_url": extract_image_url(raw),
                "type": normalize_type(details.get("type")),
                "watering": normalize_watering(details.get("watering")),
                "care_level": normalize_care_level(details.get("care_level")),
                "maintenance": normalize_maintenance(details.get("maintenance")),
                "cycle": normalize_cycle(details.get("cycle")),
                "hardiness_min": parse_float(hardiness.get("min")),
                "hardiness_max": parse_float(hardiness.get("max")),
                "hardiness_missing": int(hardiness.get("min") is None or hardiness.get("max") is None),
                "medicinal": int(details.get("medicinal") is True),
                "toxic_to_pets": int(toxicity.get("pets") is True),
                "pet_safe": int(toxicity.get("pets") is False),
                "has_image": extract_has_image(raw),
                "type_missing": int(details.get("type") in (None, "")),
                "watering_missing": int(details.get("watering") in (None, "")),
                "care_level_missing": int(details.get("care_level") in (None, "")),
                "maintenance_missing": int(details.get("maintenance") in (None, "")),
                "cycle_missing": int(details.get("cycle") in (None, "")),
            }
            plants.append(plant)

        return plants
    finally:
        client.close()


def choose_zone_within_range(zmin: float, zmax: float) -> int | None:
    zmin_int = parse_zone_int(zmin)
    zmax_int = parse_zone_int(zmax)
    if zmin_int is None or zmax_int is None:
        return None
    if zmin_int > zmax_int:
        zmin_int, zmax_int = zmax_int, zmin_int
    return random.randint(zmin_int, zmax_int)


def build_synthetic_queries(plants: Sequence[Dict[str, Any]], count: int) -> List[Dict[str, Any]]:
    if not plants:
        return []

    sample_size = min(max(1, count), len(plants))
    seeds = random.sample(list(plants), sample_size)
    queries: List[Dict[str, Any]] = []

    for seed in seeds:
        query = {
            "watering": None if seed.get("watering") == "Unknown" else seed.get("watering"),
            "care_level": None if seed.get("care_level") == "Unknown" else seed.get("care_level"),
            "type": None if seed.get("type") == "Unknown" else seed.get("type"),
            "cycle": None if seed.get("cycle") == "Unknown" else seed.get("cycle"),
            "hardiness_zone": choose_zone_within_range(seed.get("hardiness_min"), seed.get("hardiness_max")),
            "low_maintenance": seed.get("maintenance") == "Low",
            "pet_safe": seed.get("pet_safe") == 1,
            "medicinal": seed.get("medicinal") == 1,
        }

        for field in ("watering", "care_level", "type", "cycle"):
            if random.random() < 0.18:
                query[field] = None

        if random.random() < 0.25:
            query["low_maintenance"] = False

        if random.random() < 0.4:
            query["pet_safe"] = False

        if random.random() < 0.45:
            query["medicinal"] = False

        if random.random() < 0.15:
            query["hardiness_zone"] = None

        queries.append(query)

    return queries


def zone_distance(profile_zone: int | None, plant: Dict[str, Any]) -> float:
    if profile_zone is None:
        return float("nan")

    zmin = parse_zone_int(plant.get("hardiness_min"))
    zmax = parse_zone_int(plant.get("hardiness_max"))
    if zmin is None or zmax is None:
        return float("nan")
    if zmin <= profile_zone <= zmax:
        return 0.0
    if profile_zone < zmin:
        return float(zmin - profile_zone)
    return float(profile_zone - zmax)


def is_zone_match(profile_zone: int | None, plant: Dict[str, Any]) -> int:
    distance = zone_distance(profile_zone, plant)
    return int(not np.isnan(distance) and distance == 0.0)


def bool_match(left: Any, right: Any) -> int:
    return int(left is not None and right is not None and left == right)


def derive_pseudo_label(profile: Dict[str, Any], plant: Dict[str, Any]) -> int:
    score = 0.0

    score += bool_match(profile.get("watering"), plant.get("watering")) * 2.0
    score += bool_match(profile.get("care_level"), plant.get("care_level")) * 2.0
    score += bool_match(profile.get("type"), plant.get("type")) * 2.5
    score += bool_match(profile.get("cycle"), plant.get("cycle")) * 1.5

    if profile.get("low_maintenance"):
        maintenance = plant.get("maintenance")
        if maintenance == "Low":
            score += 2.0
        elif maintenance == "Moderate":
            score += 0.75
        elif maintenance != "Unknown":
            score -= 0.5

    if profile.get("pet_safe"):
        if plant.get("pet_safe") == 1:
            score += 2.0
        elif plant.get("toxic_to_pets") == 1:
            score -= 1.75
        else:
            score -= 0.35

    if profile.get("medicinal"):
        if plant.get("medicinal") == 1:
            score += 1.8
        else:
            score -= 0.4

    zone_gap = zone_distance(profile.get("hardiness_zone"), plant)
    if profile.get("hardiness_zone") is not None:
        if np.isnan(zone_gap):
            score -= 0.25
        elif zone_gap == 0:
            score += 3.0
        elif zone_gap == 1:
            score += 0.5
        else:
            score -= min(zone_gap, 4.0)

    if plant.get("pet_safe") == 1:
        score += 0.25
    if plant.get("has_image") == 1:
        score += 0.15
    if plant.get("type") == "Unknown":
        score -= 0.35
    if plant.get("care_level") == "Unknown":
        score -= 0.25

    if score >= 8:
        return 3
    if score >= 5:
        return 2
    if score >= 2:
        return 1
    return 0


def make_pair_row(profile: Dict[str, Any], plant: Dict[str, Any], qid: int) -> Dict[str, Any]:
    zone_gap = zone_distance(profile.get("hardiness_zone"), plant)

    return {
        "qid": qid,
        "plant_id": plant.get("id"),
        "common_name": plant.get("common_name"),
        "latin_name": plant.get("latin_name"),
        "pref_watering": profile.get("watering") or "Unknown",
        "pref_care_level": profile.get("care_level") or "Unknown",
        "pref_type": profile.get("type") or "Unknown",
        "pref_cycle": profile.get("cycle") or "Unknown",
        "pref_hardiness_zone": np.nan if profile.get("hardiness_zone") is None else float(profile.get("hardiness_zone")),
        "pref_low_maintenance": int(bool(profile.get("low_maintenance"))),
        "pref_pet_safe": int(bool(profile.get("pet_safe"))),
        "pref_medicinal": int(bool(profile.get("medicinal"))),
        "plant_watering": plant.get("watering"),
        "plant_care_level": plant.get("care_level"),
        "plant_type": plant.get("type"),
        "plant_cycle": plant.get("cycle"),
        "plant_maintenance": plant.get("maintenance"),
        "plant_has_image": plant.get("has_image"),
        "plant_medicinal": plant.get("medicinal"),
        "plant_pet_safe": plant.get("pet_safe"),
        "plant_toxic_to_pets": plant.get("toxic_to_pets"),
        "plant_type_missing": plant.get("type_missing"),
        "plant_watering_missing": plant.get("watering_missing"),
        "plant_care_level_missing": plant.get("care_level_missing"),
        "plant_maintenance_missing": plant.get("maintenance_missing"),
        "plant_cycle_missing": plant.get("cycle_missing"),
        "hardiness_min": plant.get("hardiness_min"),
        "hardiness_max": plant.get("hardiness_max"),
        "hardiness_missing": plant.get("hardiness_missing"),
        "match_watering": bool_match(profile.get("watering"), plant.get("watering")),
        "match_care_level": bool_match(profile.get("care_level"), plant.get("care_level")),
        "match_type": bool_match(profile.get("type"), plant.get("type")),
        "match_cycle": bool_match(profile.get("cycle"), plant.get("cycle")),
        "match_low_maintenance": int(bool(profile.get("low_maintenance")) and plant.get("maintenance") == "Low"),
        "match_pet_safe": int(bool(profile.get("pet_safe")) and plant.get("pet_safe") == 1),
        "match_medicinal": int(bool(profile.get("medicinal")) and plant.get("medicinal") == 1),
        "zone_in_range": is_zone_match(profile.get("hardiness_zone"), plant),
        "zone_distance": zone_gap,
        "zone_distance_missing": int(np.isnan(zone_gap)),
    }


def build_training_frame(plants: Sequence[Dict[str, Any]], queries: Sequence[Dict[str, Any]]) -> pd.DataFrame:
    rows: List[Dict[str, Any]] = []
    for qid, profile in enumerate(queries, start=1):
        for plant in plants:
            row = make_pair_row(profile, plant, qid)
            row["label"] = derive_pseudo_label(profile, plant)
            rows.append(row)
    return pd.DataFrame(rows)


def encode_features(frame: pd.DataFrame, fit_columns: Sequence[str] | None = None) -> Tuple[pd.DataFrame, List[str]]:
    metadata_cols = {"qid", "label", "plant_id", "common_name", "latin_name"}
    feature_cols = [col for col in frame.columns if col not in metadata_cols]

    categorical_cols = [
        "pref_watering",
        "pref_care_level",
        "pref_type",
        "pref_cycle",
        "plant_watering",
        "plant_care_level",
        "plant_type",
        "plant_cycle",
        "plant_maintenance",
    ]

    encoded = pd.get_dummies(frame[feature_cols], columns=categorical_cols, dummy_na=False)

    if fit_columns is None:
        return encoded, list(encoded.columns)

    encoded = encoded.reindex(columns=list(fit_columns), fill_value=0.0)
    return encoded, list(fit_columns)


def train_ranker(train_df: pd.DataFrame):
    x_train, feature_columns = encode_features(train_df)
    y_train = train_df["label"].astype(float).to_numpy()
    groups = train_df.groupby("qid", sort=True).size().tolist()

    dtrain = xgb.DMatrix(x_train, label=y_train, missing=np.nan)
    dtrain.set_group(groups)

    params = {
        "objective": "rank:ndcg",
        "eval_metric": "ndcg@6",
        "eta": 0.08,
        "max_depth": 6,
        "min_child_weight": 2,
        "subsample": 0.9,
        "colsample_bytree": 0.8,
        "seed": RANDOM_SEED,
    }

    booster = xgb.train(params, dtrain, num_boost_round=120, verbose_eval=False)
    return booster, feature_columns


def explain_match(profile: Dict[str, Any], plant: Dict[str, Any]) -> List[str]:
    reasons: List[str] = []
    if profile.get("watering") and profile.get("watering") == plant.get("watering"):
        reasons.append("watering match")
    if profile.get("care_level") and profile.get("care_level") == plant.get("care_level"):
        reasons.append("care level match")
    if profile.get("type") and profile.get("type") == plant.get("type"):
        reasons.append("type match")
    if profile.get("cycle") and profile.get("cycle") == plant.get("cycle"):
        reasons.append("cycle match")
    if is_zone_match(profile.get("hardiness_zone"), plant):
        reasons.append("hardiness match")
    if profile.get("low_maintenance") and plant.get("maintenance") == "Low":
        reasons.append("low maintenance")
    if profile.get("pet_safe") and plant.get("pet_safe") == 1:
        reasons.append("pet safe")
    if profile.get("medicinal") and plant.get("medicinal") == 1:
        reasons.append("medicinal use")
    if not reasons:
        reasons.append("model-ranked match")
    return reasons[:4]


def rank_for_profile(
    booster,
    feature_columns: Sequence[str],
    plants: Sequence[Dict[str, Any]],
    profile: Dict[str, Any],
    top_k: int,
) -> List[Dict[str, Any]]:
    inference_rows = [make_pair_row(profile, plant, qid=1) for plant in plants]
    inference_df = pd.DataFrame(inference_rows)
    x_infer, _ = encode_features(inference_df, fit_columns=feature_columns)

    dtest = xgb.DMatrix(x_infer, missing=np.nan)
    preds = booster.predict(dtest)

    ranked: List[Dict[str, Any]] = []
    for plant, pred in zip(plants, preds):
        ranked.append(
            {
                "id": plant.get("id"),
                "common_name": plant.get("common_name"),
                "latin_name": plant.get("latin_name"),
                "image_url": plant.get("image_url"),
                "type": plant.get("type"),
                "watering": plant.get("watering"),
                "care_level": plant.get("care_level"),
                "cycle": plant.get("cycle"),
                "maintenance": plant.get("maintenance"),
                "medicinal": plant.get("medicinal"),
                "pet_safe": plant.get("pet_safe"),
                "hardiness_min": parse_zone_int(plant.get("hardiness_min")),
                "hardiness_max": parse_zone_int(plant.get("hardiness_max")),
                "xgb_score": round(float(pred), 6),
                "demo_reasons": explain_match(profile, plant),
            }
        )

    return sorted(ranked, key=lambda item: item["xgb_score"], reverse=True)[:top_k]


def build_default_profile(plants: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    candidates = [
        plant for plant in plants
        if plant.get("type") != "Unknown" and plant.get("watering") != "Unknown"
    ]
    seed = random.choice(candidates or list(plants))
    return {
        "watering": None if seed.get("watering") == "Unknown" else seed.get("watering"),
        "care_level": None if seed.get("care_level") == "Unknown" else seed.get("care_level"),
        "type": None if seed.get("type") == "Unknown" else seed.get("type"),
        "cycle": None if seed.get("cycle") == "Unknown" else seed.get("cycle"),
        "hardiness_zone": choose_zone_within_range(seed.get("hardiness_min"), seed.get("hardiness_max")) or 6,
        "low_maintenance": seed.get("maintenance") == "Low",
        "pet_safe": False,
        "medicinal": False,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Standalone SoilSync XGBoost ranking demo (Mongo-backed)")
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
    parser.add_argument("--save-model", type=Path, default=None, help="Optional path to save the trained booster")
    return parser.parse_args()


def build_cli_profile(args: argparse.Namespace, plants: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    profile = {
        "watering": None,
        "care_level": None,
        "type": None,
        "cycle": None,
        "hardiness_zone": None,
        "low_maintenance": False,
        "pet_safe": False,
        "medicinal": False,
    }

    has_explicit_preferences = any(
        (
            args.watering,
            args.care_level,
            args.plant_type,
            args.cycle,
            args.hardiness_zone is not None,
            args.low_maintenance,
            args.pet_safe,
            args.medicinal,
        )
    )

    if not has_explicit_preferences:
        profile.update(build_default_profile(plants))

    if args.watering:
        normalized = normalize_watering(args.watering)
        profile["watering"] = None if normalized == "Unknown" else normalized
    if args.care_level:
        normalized = normalize_care_level(args.care_level)
        profile["care_level"] = None if normalized == "Unknown" else normalized
    if args.plant_type:
        normalized = normalize_type(args.plant_type)
        profile["type"] = None if normalized == "Unknown" else normalized
    if args.cycle:
        normalized = normalize_cycle(args.cycle)
        profile["cycle"] = None if normalized == "Unknown" else normalized
    if args.hardiness_zone is not None:
        profile["hardiness_zone"] = args.hardiness_zone
    if args.low_maintenance:
        profile["low_maintenance"] = True
    if args.pet_safe:
        profile["pet_safe"] = True
    if args.medicinal:
        profile["medicinal"] = True

    return profile


def main():
    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)
    args = parse_args()

    try:
        plants = load_plants_from_mongo(
            mongo_uri=args.mongo_uri,
            database_name=args.database,
            collection_name=args.collection,
            limit=args.limit_plants,
        )
    except Exception as exc:
        print(
            json.dumps(
                {
                    "error": "Failed to load plants from MongoDB.",
                    "details": str(exc),
                    "mongo_uri": args.mongo_uri,
                    "database": args.database,
                    "collection": args.collection,
                },
                indent=2,
            )
        )
        sys.exit(1)

    if not plants:
        print(json.dumps({"error": "No plants were loaded from MongoDB."}, indent=2))
        sys.exit(1)

    queries = build_synthetic_queries(plants, count=max(8, args.queries))
    train_df = build_training_frame(plants, queries)
    booster, feature_columns = train_ranker(train_df)

    if args.save_model:
        args.save_model.parent.mkdir(parents=True, exist_ok=True)
        booster.save_model(str(args.save_model))

    profile = build_cli_profile(args, plants)
    recommendations = rank_for_profile(
        booster=booster,
        feature_columns=feature_columns,
        plants=plants,
        profile=profile,
        top_k=max(1, args.top_k),
    )

    summary = {
        "mode": "xgboost_ranker_demo_mongo",
        "mongo": {
            "uri": args.mongo_uri,
            "database": args.database,
            "collection": args.collection,
        },
        "plants_loaded": len(plants),
        "synthetic_queries": len(queries),
        "training_rows": int(len(train_df)),
        "supported_preferences": list(SUPPORTED_PREFS),
        "profile_used": profile,
        "normalization_notes": {
            "database_modified": False,
            "watering": ["Frequent", "Average", "Minimum", "Unknown"],
            "care_level": ["Low", "Medium", "High", "Unknown"],
            "cycle": ["Annual", "Biennial", "Perennial", "Unknown"],
            "missing_handling": "numeric values stay NaN for XGBoost; categorical values become 'Unknown' plus missing flags",
        },
        "recommendations": recommendations,
        "notes": [
            "This is a demo ranker trained on synthetic query labels.",
            "It is not integrated into the web app.",
            "Normalization is used only inside this script.",
        ],
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
