#!/usr/bin/env bash
# Maakt de iconen en het startscherm van de Android-app uit icons/ (ImageMagick nodig).
#
#   tools/android-icons.sh
#
# Draai dit opnieuw als het icoon van het spel verandert. De uitkomst staat in de repo
# (android-app/android/app/src/main/res), dus voor een gewone build is het niet nodig.
set -euo pipefail
cd "$(dirname "$0")/.."
RES=android-app/android/app/src/main/res
BG='#FF8EB4'          # de randkleur van icons/icon-maskable-512.png

for spec in mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  IFS=: read -r name legacy adaptive <<< "$spec"
  # Oude Android-versies: het gewone icoon (met ronde hoeken).
  magick icons/icon-512.png -resize "${legacy}x${legacy}" "$RES/mipmap-$name/ic_launcher.png"
  magick icons/icon-512.png -resize "${legacy}x${legacy}" "$RES/mipmap-$name/ic_launcher_round.png"
  # Adaptief icoon: Android snijdt zelf een vorm uit het midden (66 van de 108 dp). Het maskable
  # icoon heeft zijn tekening al ruim binnen die zone, dus het kan er op volle grootte in.
  magick icons/icon-maskable-512.png -resize "${adaptive}x${adaptive}" "$RES/mipmap-$name/ic_launcher_foreground.png"
done
printf '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n' "$BG" > "$RES/values/ic_launcher_background.xml"

# Startscherm: effen roze met het icoon in het midden.
for file in "$RES"/drawable*/splash.png; do
  size="$(magick identify -format '%wx%h' "$file")"
  w="${size%x*}"; h="${size#*x}"; short=$(( w < h ? w : h )); icon=$(( short * 40 / 100 ))
  magick -size "$size" "xc:$BG" \( icons/icon-512.png -resize "${icon}x${icon}" \) -gravity center -composite "$file"
done
echo "Iconen en startscherm bijgewerkt in $RES"
