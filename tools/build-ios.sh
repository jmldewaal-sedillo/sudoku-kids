#!/usr/bin/env bash
# Bouwt de iOS-app (Capacitor) uit dezelfde bestanden als de Android-app.
#
#   tools/build-ios.sh             # webbestanden + Capacitor-sync naar het Xcode-project (kan op elke computer)
#   tools/build-ios.sh simulator   # en daarna bouwen voor de iOS-simulator, zonder ondertekening (alleen op een Mac)
#
# Uploaden naar App Store Connect gaat met Xcode (Product → Archive) op een Mac, met het
# Apple-account van Studio Sedillo. Op deze Linux-computer kan dat niet; de workflow
# .github/workflows/app-build.yml bouwt en start de app op een Mac van GitHub.
# Uitleg: docs/ios.md.
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:-sync}"
APP=app

echo "== 1. Webbestanden voor de app (zonder service worker)"
node tools/build.mjs app

echo "== 2. Capacitor: bestanden en plug-ins naar het Xcode-project"
( cd "$APP" && { [ -d node_modules ] || npm ci; } && npx cap sync ios )

if [ "$MODE" = simulator ]; then
  command -v xcodebuild >/dev/null || { echo "xcodebuild ontbreekt: bouwen voor iOS kan alleen op een Mac met Xcode (docs/ios.md)."; exit 1; }
  echo "== 3. Xcode: bouwen voor de simulator"
  xcodebuild -project "$APP/ios/App/App.xcodeproj" -scheme App -configuration Debug \
    -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath "$APP/ios/build" CODE_SIGNING_ALLOWED=NO build | tail -n 5
  echo "Klaar: $APP/ios/build/Build/Products/Debug-iphonesimulator/App.app"
else
  echo "Klaar: het Xcode-project staat in $APP/ios/App (openen op een Mac: cd $APP && npx cap open ios)"
fi
