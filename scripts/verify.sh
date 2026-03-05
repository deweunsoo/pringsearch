#!/bin/bash
# pringsearch 자동 검증 스크립트
# 타입체크 + 테스트 + 빌드 순서로 실행, 하나라도 실패하면 즉시 종료

set -e

cd "$(dirname "$0")/.."

echo "=== [1/3] TypeScript 타입 체크 ==="
npx tsc -b --noEmit 2>&1
echo "✓ 타입 체크 통과"

echo ""
echo "=== [2/3] 테스트 실행 ==="
npx vitest run 2>&1
echo "✓ 테스트 통과"

echo ""
echo "=== [3/3] 빌드 ==="
npx electron-vite build 2>&1
echo "✓ 빌드 통과"

echo ""
echo "=== 모든 검증 통과 ==="
