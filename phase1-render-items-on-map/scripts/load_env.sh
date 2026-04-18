#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
ENV_LOCAL_FILE="$SCRIPT_DIR/../.env.local"

set -a
[ -f "$ENV_FILE" ] && source "$ENV_FILE"
[ -f "$ENV_LOCAL_FILE" ] && source "$ENV_LOCAL_FILE"
set +a
