#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

if [ -f ".venv/bin/pytest" ]; then
    PYTEST_BIN=".venv/bin/pytest"
elif command -v pytest >/dev/null 2>&1; then
    PYTEST_BIN="pytest"
else
    echo "Error: pytest not found. Please create or activate virtual environment."
    exit 1
fi

echo "================================================================================"
echo "Running Parkinson's Voice Screening Platform - Backend & ML Test Suite"
echo "================================================================================"
"${PYTEST_BIN}" -v backend/tests ml/tests "$@"
