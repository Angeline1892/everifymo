#!/bin/sh
set -e

DATASETS_DIR="backend/nlp/datasets"
ASSET_DIR="backend/nlp/assets"
HASH_FILE="$ASSET_DIR/.raw_hash"

mkdir -p "$ASSET_DIR"

if ls "$DATASETS_DIR"/*.csv 1> /dev/null 2>&1; then
    CURRENT_HASH=$(cat "$DATASETS_DIR"/*.csv | sha256sum | cut -d ' ' -f 1)

    if [ ! -f "$HASH_FILE" ] || [ "$(cat "$HASH_FILE" 2>/dev/null)" != "$CURRENT_HASH" ]; then
        echo "Raw dataset changed (or first run) — rebuilding assets..."
        cd backend && python nlp/preprocessing/buildassets.py && cd ..
        echo "$CURRENT_HASH" > "$HASH_FILE"
    else
        echo "Raw dataset unchanged — skipping rebuild, using existing assets."
    fi
else
    echo "No raw CSV files found in $DATASETS_DIR. Skipping asset build, using existing assets."
fi

exec uvicorn backend.main:app --host 0.0.0.0 --port 8001