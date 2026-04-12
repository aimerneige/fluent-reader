#!/bin/bash
set -e

PROJECT_NAME="fluent-reader"
TARGET_COMMIT="feb64294682e08a0c10b863cf1c2e788dac9356d"
TARGET_BUNDLE_PATH="$HOME/Documents/${PROJECT_NAME}"
TARGET_BUNDLE_NAME="${PROJECT_NAME}_mini.bundle"
TEMP_PROJECT_PATH="${TARGET_BUNDLE_PATH}/temp_${PROJECT_NAME}"

trap 'echo "Cleaning temp files..."; rm -rf "${TEMP_PROJECT_PATH}"' EXIT

echo "Calculating commit depth..."
COMMIT_COUNT=$(git rev-list --count "${TARGET_COMMIT}..HEAD")
DEPTH=$((COMMIT_COUNT + 1))
echo "Depth calculated as: ${DEPTH}"

echo "Creating bundle..."
mkdir -p "${TARGET_BUNDLE_PATH}"
git clone --depth ${DEPTH} --single-branch "file://$(pwd)" "${TEMP_PROJECT_PATH}"
cd "${TEMP_PROJECT_PATH}"
git bundle create "${TARGET_BUNDLE_PATH}/${TARGET_BUNDLE_NAME}" HEAD
echo "Bundle created at ${TARGET_BUNDLE_PATH}/${TARGET_BUNDLE_NAME}"

git bundle verify "${TARGET_BUNDLE_PATH}/${TARGET_BUNDLE_NAME}"
echo "Bundle verified"
