#!/bin/bash
set -e

echo "Pringsearch 설치 중..."

# 최신 릴리즈 URL 가져오기
URL=$(curl -s https://api.github.com/repos/deweunsoo/pringsearch/releases/latest | grep 'browser_download_url.*arm64-mac\.zip"' | cut -d '"' -f 4)

if [ -z "$URL" ]; then
  echo "다운로드 URL을 찾을 수 없습니다."
  exit 1
fi

# 다운로드
TMPDIR=$(mktemp -d)
echo "다운로드 중..."
curl -L -o "$TMPDIR/Pringsearch.zip" "$URL"

# 압축 해제
echo "설치 중..."
unzip -q "$TMPDIR/Pringsearch.zip" -d "$TMPDIR"

# 기존 앱 제거 후 설치
rm -rf /Applications/Pringsearch.app
mv "$TMPDIR/Pringsearch.app" /Applications/

# Gatekeeper 해제
xattr -cr /Applications/Pringsearch.app

# 정리
rm -rf "$TMPDIR"

echo "설치 완료! Applications에서 Pringsearch를 실행하세요."
open /Applications/Pringsearch.app
