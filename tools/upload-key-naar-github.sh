#!/usr/bin/env bash
# Maakt de upload key voor Google Play (als die er nog niet is) en zet hem als geheim in de repo
# jmldewaal-sedillo/sudoku-kids, zodat de workflow "App release" een ondertekende .aab bouwt.
#
#   tools/upload-key-naar-github.sh --dry-run   # laat zien wat er zou gebeuren, doet niets
#   tools/upload-key-naar-github.sh             # vraagt het wachtwoord en daarna om bevestiging
#
# Draai dit zelf in een eigen terminal (Jenn), niet via Claude Code: het wachtwoord typ je hier
# in en het wordt nergens getoond of opgeslagen, behalve in de keystore en als GitHub-geheim.
# Uitleg: docs/android.md, "De upload key".
set -euo pipefail
cd "$(dirname "$0")/.."

REPO=jmldewaal-sedillo/sudoku-kids
KS="$HOME/.studio-sedillo/sudokukids-upload.keystore"
ALIAS=upload
DRY=0
[ "${1:-}" = --dry-run ] && DRY=1

command -v keytool >/dev/null || { echo "keytool ontbreekt (zit in Java: sudo dnf install java-21-openjdk-devel)."; exit 1; }
command -v gh >/dev/null || { echo "gh ontbreekt."; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Eerst inloggen: gh auth login"; exit 1; }

if [ -f "$KS" ]; then
  echo "Upload key bestaat al: $KS (wordt niet opnieuw gemaakt)."
  NEW=0
else
  echo "Upload key wordt gemaakt: $KS"
  NEW=1
fi
echo "Geheimen in $REPO: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS ($ALIAS), ANDROID_KEY_PASSWORD"
if [ "$DRY" = 1 ]; then echo "(--dry-run: niets gedaan)"; exit 0; fi
[ -t 0 ] || { echo "Geen terminal: niets gedaan."; exit 1; }

# Eén wachtwoord voor keystore en sleutel (PKCS12 kent er maar één).
read -rsp "Wachtwoord van de upload key: " PW; echo
if [ "$NEW" = 1 ]; then
  read -rsp "Nog een keer: " PW2; echo
  [ "$PW" = "$PW2" ] || { echo "De twee wachtwoorden verschillen."; exit 1; }
  [ "${#PW}" -ge 12 ] || { echo "Kies een wachtwoord van minstens 12 tekens."; exit 1; }
fi
export SK_PW="$PW"

read -rp "Doorgaan? [j/N] " OK
[ "$OK" = j ] || { echo "Gestopt."; exit 1; }

if [ "$NEW" = 1 ]; then
  mkdir -p "$(dirname "$KS")"
  # Alleen de naam en het land, geen adres.
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Studio Sedillo, O=Studio Sedillo, C=NL" \
    -storepass:env SK_PW -keypass:env SK_PW
  chmod 600 "$KS"
fi

# Klopt het wachtwoord bij de bestaande key?
keytool -list -keystore "$KS" -alias "$ALIAS" -storepass:env SK_PW >/dev/null \
  || { echo "Wachtwoord of alias klopt niet bij $KS."; exit 1; }

base64 -w0 "$KS" | gh secret set ANDROID_KEYSTORE_BASE64 -R "$REPO"
printf '%s' "$SK_PW" | gh secret set ANDROID_KEYSTORE_PASSWORD -R "$REPO"
printf '%s' "$SK_PW" | gh secret set ANDROID_KEY_PASSWORD -R "$REPO"
printf '%s' "$ALIAS" | gh secret set ANDROID_KEY_ALIAS -R "$REPO"
unset SK_PW PW PW2

echo
echo "Klaar. Nu nog:"
echo "  1. Bewaar $KS en het wachtwoord op twee plekken los van deze laptop"
echo "     (wachtwoordmanager met bijlage + versleutelde usb-stick)."
echo "  2. GitHub → $REPO → Actions → \"App release\" → Run workflow (branch main),"
echo "     of laat Claude Code dat doen. De .aab staat daarna onder Artifacts: sudoku-kids-aab."
