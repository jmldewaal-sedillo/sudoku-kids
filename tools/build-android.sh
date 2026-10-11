#!/usr/bin/env bash
# Bouwt de Android-app (Capacitor) uit dezelfde code als de webversie.
#
#   tools/build-android.sh           # debug-APK om op je eigen toestel of een emulator te proberen
#   tools/build-android.sh release   # ondertekende .aab voor Google Play (vraagt de upload key)
#
# Nodig: Node 22+, en Android Studio (dat levert de Android-SDK en de JDK mee).
# Uitleg, ook over de upload key en Play App Signing: docs/android.md.
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:-debug}"
APP=android-app

# De Android-SDK: van Android Studio, of uit ANDROID_HOME.
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
[ -d "$SDK" ] || { echo "Android-SDK niet gevonden in $SDK. Installeer Android Studio (docs/android.md, 'Eenmalig klaarzetten')."; exit 1; }
export ANDROID_HOME="$SDK"
# De JDK van Android Studio, als die er is (de JDK van het systeem kan te nieuw zijn voor Gradle).
for jbr in "$HOME/android-studio/jbr" /opt/android-studio/jbr /usr/local/android-studio/jbr "$HOME/.local/share/JetBrains/Toolbox/apps/android-studio/jbr"; do
  if [ -z "${JAVA_HOME:-}" ] && [ -x "$jbr/bin/java" ]; then export JAVA_HOME="$jbr"; fi
done

echo "== 1. Webbestanden voor de app (zonder service worker)"
node tools/build.mjs android

echo "== 2. Capacitor: bestanden en plug-ins naar het Android-project"
( cd "$APP" && { [ -d node_modules ] || npm ci; } && npx cap sync android )

echo "== 3. Gradle"
cd "$APP/android"
if [ "$MODE" = release ]; then
  [ -f keystore.properties ] || { echo "keystore.properties ontbreekt in $APP/android. Zie docs/android.md, 'De upload key'."; exit 1; }
  ./gradlew --no-daemon bundleRelease
  OUT="app/build/outputs/bundle/release/app-release.aab"
  echo "Klaar: $APP/android/$OUT  (uploaden in Play Console)"
else
  ./gradlew --no-daemon assembleDebug
  OUT="app/build/outputs/apk/debug/app-debug.apk"
  echo "Klaar: $APP/android/$OUT  (installeren: adb install -r $APP/android/$OUT)"
fi
