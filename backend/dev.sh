#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

find_python() {
  if command -v python >/dev/null 2>&1 && python --version >/dev/null 2>&1; then
    printf '%s\n' "python"
    return
  fi

  if [[ -n "${LOCALAPPDATA:-}" ]]; then
    local local_app_data_unix
    local candidate

    local_app_data_unix="$(cygpath -u "$LOCALAPPDATA")"
    candidate="$local_app_data_unix/Programs/Python/Python312/python.exe"

    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  fi

  printf '%s\n' "Python 3.12 introuvable. Installe-le d'abord ou corrige le PATH." >&2
  exit 1
}

PYTHON_CMD="$(find_python)"

if [[ ! -d ".venv" ]]; then
  "$PYTHON_CMD" -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/Scripts/activate

python -m pip install --upgrade pip
python -m pip install -r requirements.txt
exec python -m uvicorn main:app --reload
