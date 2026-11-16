#!/usr/bin/env bash
# Builds teton.pmtiles: an offline copy of the base map (roads, water, forests, place names) for the Teton area.
# Run it once on a computer (Mac/Linux). Then in the app: Menu > Offline terrain > Offline base map > Choose .pmtiles file.
# Needs: Java 17+, curl, and osmium-tool (macOS: brew install osmium-tool | Debian/Ubuntu: apt install osmium-tool).
# Takes roughly 10-20 minutes and about 4 GB of free memory and 2 GB of disk (the working files can be deleted afterwards).
set -euo pipefail

# Area to cover: west, south, east, north (a little bigger than Grand Teton National Park and the surrounding range)
BBOX="${BBOX:--111.25,43.30,-110.30,44.25}"
MAXZOOM="${MAXZOOM:-14}"
WORK="${WORK:-./offline-map-work}"
OUT="${OUT:-./teton.pmtiles}"

for cmd in java curl osmium; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing: $cmd. See the notes at the top of this file."; exit 1; }
done
mkdir -p "$WORK"; cd "$WORK"

# 1. Map data: the Teton Range sits on the Wyoming/Idaho border, so take both states and cut out the area
[ -f wyoming.osm.pbf ] || curl -L --fail -o wyoming.osm.pbf https://download.geofabrik.de/north-america/us/wyoming-latest.osm.pbf
[ -f idaho.osm.pbf ]   || curl -L --fail -o idaho.osm.pbf   https://download.geofabrik.de/north-america/us/idaho-latest.osm.pbf
osmium extract --overwrite --bbox "$BBOX" -o teton.osm.pbf wyoming.osm.pbf idaho.osm.pbf 2>/dev/null \
  || { osmium merge --overwrite -o both.osm.pbf wyoming.osm.pbf idaho.osm.pbf && osmium extract --overwrite --bbox "$BBOX" -o teton.osm.pbf both.osm.pbf; }

# 2. Tile builder: Planetiler, using the same OpenMapTiles layout as the app's online map
[ -f planetiler.jar ] || curl -L --fail -o planetiler.jar https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar

# 3. Build (Planetiler downloads the small water/land helper datasets itself)
java -Xmx4g -jar planetiler.jar \
  --osm-path=teton.osm.pbf \
  --bounds="$BBOX" \
  --maxzoom="$MAXZOOM" \
  --download --fetch-wikidata=false \
  --output=teton.pmtiles --force

cd - >/dev/null
mv -f "$WORK/teton.pmtiles" "$OUT"
echo
echo "Done: $OUT ($(du -h "$OUT" | cut -f1))."
echo "Install it in the app (Menu > Offline terrain > Offline base map > Choose .pmtiles file),"
echo "or put it next to index.html in the app's repo as teton.pmtiles and use 'Download teton.pmtiles from the app's site' on each device."
echo "(GitHub rejects files over 100 MB; if yours is bigger, rerun with a smaller BBOX or MAXZOOM=13.)"
