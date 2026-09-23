#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"

cd "${FRONTEND_DIR}"

echo "================================================================================"
echo "Running Parkinson's Voice Screening Platform - Frontend Test Suite (Vitest)"
echo "================================================================================"

npm run test -- "$@"
