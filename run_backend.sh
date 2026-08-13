#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${PROJECT_ROOT}/runtime"
LOG_FILE="${RUNTIME_DIR}/backend.log"

mkdir -p "${RUNTIME_DIR}"

SESSION_NAME="lerobot_annotate_backend"

if screen -list | grep -q "${SESSION_NAME}"; then
    echo "Screen session '${SESSION_NAME}' already exists. Killing it..."
    screen -S "${SESSION_NAME}" -X quit
    sleep 1
fi

source "$(conda info --base)/etc/profile.d/conda.sh" || source "${HOME}/miniconda3/etc/profile.d/conda.sh" || source "${HOME}/anaconda3/etc/profile.d/conda.sh"
conda activate pi0

screen -dmS "${SESSION_NAME}" bash -c "cd '${PROJECT_ROOT}' && source \"\$(conda info --base)/etc/profile.d/conda.sh\" && conda activate pi0 && uvicorn backend.app:app --reload --host 0.0.0.0 --port 7860 2>&1 | tee '${LOG_FILE}'"

echo "Backend started in screen session '${SESSION_NAME}'"
echo "Log file: ${LOG_FILE}"
echo "Attach with: screen -r ${SESSION_NAME}"
