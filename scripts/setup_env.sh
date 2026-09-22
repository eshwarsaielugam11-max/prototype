#!/usr/bin/env bash
set -euo pipefail

# Determine repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Setting up Python virtual environment (.venv) ==="
cd "${REPO_ROOT}"

# Detect Python binary (prefer stable versions 3.11 / 3.12 / 3.10 for PyTorch compatibility)
PYTHON_CMD=""
for cmd in python3.11 python3.12 python3.10 python3 python; do
    if command -v "${cmd}" >/dev/null 2>&1; then
        PYTHON_CMD="${cmd}"
        break
    fi
done

if [ -z "${PYTHON_CMD}" ]; then
    echo "Error: Python 3 is required but was not found in PATH." >&2
    exit 1
fi

echo "Using Python: $(${PYTHON_CMD} --version)"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment at ${REPO_ROOT}/.venv..."
    "${PYTHON_CMD}" -m venv .venv
else
    echo "Virtual environment already exists at ${REPO_ROOT}/.venv."
fi

# Activate virtual environment
# shellcheck source=/dev/null
source "${REPO_ROOT}/.venv/bin/activate"
python -m pip install --upgrade pip

# TODO: Once backend/requirements.txt exists, install dependencies.
# Do not fail if the file is missing yet.
REQUIREMENTS_FILE="${REPO_ROOT}/backend/requirements.txt"
if [ -f "${REQUIREMENTS_FILE}" ]; then
    echo "Installing dependencies from ${REQUIREMENTS_FILE}..."
    pip install -r "${REQUIREMENTS_FILE}"
else
    echo "Note: ${REQUIREMENTS_FILE} not found yet. Skipping pip install."
    echo "Dependencies will be installed once backend/requirements.txt is created."
fi

echo ""
echo "=== Environment setup complete ==="
echo "To activate the environment in your shell, run:"
echo "    source .venv/bin/activate"
