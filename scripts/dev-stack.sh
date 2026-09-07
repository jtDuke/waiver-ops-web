#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_ROOT="$(dirname -- "$WEB_ROOT")"
API_ROOT="$WORKSPACE_ROOT/waiver_priority"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"

if [[ -x "$API_ROOT/.venv/Scripts/python.exe" ]]; then
  PYTHON="$API_ROOT/.venv/Scripts/python.exe"
elif [[ -x "$API_ROOT/.venv/bin/python" ]]; then
  PYTHON="$API_ROOT/.venv/bin/python"
else
  echo "The Waiver Ops Python environment was not found under $API_ROOT/.venv" >&2
  exit 1
fi

if [[ ! -d "$WEB_ROOT/node_modules" ]]; then
  echo "Frontend dependencies are missing. Run 'npm install' once from $WEB_ROOT" >&2
  exit 1
fi

mkdir -p "$WEB_ROOT/.devlogs"
API_PID=""

cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID"
    wait "$API_PID" 2>/dev/null || true
    echo "Stopped the local Waiver Ops API."
  fi
}
trap cleanup EXIT INT TERM

if curl --silent --fail "http://127.0.0.1:$API_PORT/health/live" >/dev/null 2>&1; then
  echo "Using the Waiver Ops API already running on port $API_PORT."
else
  (
    cd "$API_ROOT"
    exec "$PYTHON" -m uvicorn waiver_api.main:app --host 127.0.0.1 --port "$API_PORT"
  ) >"$WEB_ROOT/.devlogs/api.stdout.log" 2>"$WEB_ROOT/.devlogs/api.stderr.log" &
  API_PID=$!

  for _ in {1..40}; do
    if ! kill -0 "$API_PID" 2>/dev/null; then
      echo "The Waiver Ops API stopped during startup." >&2
      cat "$WEB_ROOT/.devlogs/api.stderr.log" >&2
      exit 1
    fi
    if curl --silent --fail "http://127.0.0.1:$API_PORT/health/live" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done

  if ! curl --silent --fail "http://127.0.0.1:$API_PORT/health/live" >/dev/null 2>&1; then
    echo "The Waiver Ops API did not become ready. Check .devlogs/api.stderr.log" >&2
    exit 1
  fi
  echo "Waiver Ops API ready at http://127.0.0.1:$API_PORT"
fi

export WAIVER_API_BASE_URL="http://127.0.0.1:$API_PORT"
echo "Starting the website at http://localhost:$WEB_PORT"
echo "Press Ctrl+C once to stop the local stack."
cd "$WEB_ROOT"
npm run dev -- --port "$WEB_PORT"
