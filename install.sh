#!/bin/bash
set -e

REPO="deweunsoo/pringsearch"

echo "Pringsearch 설치 중..."

# 최신 릴리즈 메타 가져오기
API=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")

ZIP_URL=$(echo "$API" | grep 'browser_download_url.*arm64-mac\.zip"' | cut -d '"' -f 4)
YML_URL=$(echo "$API" | grep 'browser_download_url.*latest-mac\.yml"' | cut -d '"' -f 4)

if [ -z "$ZIP_URL" ] || [ -z "$YML_URL" ]; then
  echo "릴리즈 자산을 찾을 수 없습니다."
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

ZIP_NAME=$(basename "$ZIP_URL")

echo "메타데이터 다운로드 중..."
curl -fsSL -o "$TMPDIR/latest-mac.yml" "$YML_URL"

# latest-mac.yml에서 zip에 해당하는 sha512(base64) 추출
EXPECTED_SHA512=$(awk -v target="$ZIP_NAME" '
  /^  - url:/ { current = $3 }
  current == target && /^    sha512:/ { sub(/^[ ]*sha512: /, ""); print; exit }
' "$TMPDIR/latest-mac.yml" | tr -d '[:space:]')

if [ -z "$EXPECTED_SHA512" ]; then
  echo "기대 해시를 latest-mac.yml에서 찾을 수 없습니다."
  exit 1
fi

echo "다운로드 중..."
curl -fL -o "$TMPDIR/Pringsearch.zip" "$ZIP_URL"

echo "무결성 검증 중..."
ACTUAL_SHA512=$(shasum -a 512 "$TMPDIR/Pringsearch.zip" | awk '{print $1}' | xxd -r -p | base64 | tr -d '\n')

if [ "$ACTUAL_SHA512" != "$EXPECTED_SHA512" ]; then
  echo "해시 불일치 — 다운로드가 변조됐을 수 있습니다."
  echo "   기대: $EXPECTED_SHA512"
  echo "   실제: $ACTUAL_SHA512"
  exit 1
fi

echo "무결성 검증 완료"
echo "압축 해제 중..."
unzip -q "$TMPDIR/Pringsearch.zip" -d "$TMPDIR"

rm -rf /Applications/Pringsearch.app
mv "$TMPDIR/Pringsearch.app" /Applications/

echo ""
echo "설치 완료!"
echo ""
echo "처음 실행 시 macOS Gatekeeper 경고가 뜨면:"
echo "  Finder → Applications → Pringsearch 우클릭 → 열기 → 열기"
echo ""
