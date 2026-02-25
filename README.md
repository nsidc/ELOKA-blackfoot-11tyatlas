Current setup.

1. Export GeoJSON from atlas
2. Convert the GeoJSON to MVT static files: `ogr2ogr -f MVT outdir in.geojson -dsco MINZOOM=0 -dsco MAXZOOM=10 -dsco COMPRESS=NO`
  - https://gdal.org/en/stable/drivers/vector/mvt.html
  - https://openlayers.org/en/latest/apidoc/module-ol_source_VectorTile-VectorTile.html
  - https://github.com/felt/tippecanoe
3. Get the outdir into the src/public folder and adjust main.js for the name of the folder.
4. `npm run build` to create the JS bundle
5. `npm run dev` to server the application locally