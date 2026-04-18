#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load_env.sh"

error=0
for var in MAP_API_KEY MAP_URL; do
  val="${!var:-}"
  if [ -z "$val" ] || [ "$val" = "dummy" ]; then
    echo "env not set: $var"
    error=1
  fi
done

[ "$error" -eq 1 ] && exit 1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_FILE="$SCRIPT_DIR/../map/map_1649_945.json"

echo "Fetching features from $MAP_URL..."
http_code=$(curl -s -o /tmp/sync_map_response.json -w "%{http_code}" "$MAP_URL")
if [ "$http_code" != "200" ]; then
  echo "Request failed with HTTP $http_code"
  exit 1
fi
response=$(cat /tmp/sync_map_response.json)

updated=$(echo "$response" | jq \
  --argjson existing "$(cat "$OUT_FILE")" \
  '
  .data |
  {
    car: [.[] | select(.data.tip == "auto") | {
      x: .__xmin,
      y: .__ymin,
      heading: (if .data.heading == null then 0 else (.data.heading | tonumber) end)
    }],
    pedestrian: [.[] | select(.data.tip == "pješak") | {
      x: .__xmin,
      y: .__ymin,
      heading: (if .data.heading == null then 0 else (.data.heading | tonumber) end)
    }]
  } |
  { traffic_lights: . } |
  $existing + .
  '
)

echo "$updated" > "$OUT_FILE"
echo "Saved $(echo "$response" | jq '.data | length') features to $OUT_FILE"
