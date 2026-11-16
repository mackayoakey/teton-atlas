# Tools

## build-offline-map.sh
Makes `teton.pmtiles`, the offline copy of the base map. Run it on a Mac or Linux computer with Java 17+ and osmium-tool installed:

    ./tools/build-offline-map.sh

Options (environment variables): `BBOX="west,south,east,north"`, `MAXZOOM=14`, `OUT=./teton.pmtiles`.

Then install it in the app: Menu → Offline terrain → Offline base map → Choose .pmtiles file (or commit it next to `index.html` and use
"Download teton.pmtiles from the app's site" on each device). A zoom-14 file for this area is typically 40–90 MB.

Not yet run end to end (the build environment used for the app had no access to Geofabrik or GitHub releases). If a step fails, the message names it.
