#!/usr/bin/env bash
# Maakt de iconen en het startscherm van de app (Android en iOS) uit icons/ (ImageMagick nodig).
#
#   tools/app-icons.sh
#
# Draai dit opnieuw als het icoon van het spel verandert. De uitkomst staat in de repo
# (app/android/app/src/main/res en app/ios/App/App/Assets.xcassets), dus voor een gewone build
# is het niet nodig.
set -euo pipefail
cd "$(dirname "$0")/.."
RES=app/android/app/src/main/res
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

# iOS: één icoon van 1024x1024 (iOS rondt de hoeken zelf af). Apple weigert een icoon met
# doorzichtigheid, dus het maskable icoon (vol vierkant) op de achtergrondkleur, zonder alfakanaal.
XC=app/ios/App/App/Assets.xcassets
magick -background none -density 400 icons/icon-maskable.svg -resize 1024x1024 -background "$BG" -alpha remove -alpha off \
  "PNG24:$XC/AppIcon.appiconset/AppIcon-512@2x.png"
# Startscherm: hetzelfde als op Android (effen roze, icoon in het midden), in plaats van het logo van Capacitor.
for file in "$XC"/Splash.imageset/splash-*.png; do
  magick -size 2732x2732 "xc:$BG" \( icons/icon-512.png -resize 1092x1092 \) -gravity center -composite "PNG24:$file"
done
echo "Icoon en startscherm bijgewerkt in $XC"
