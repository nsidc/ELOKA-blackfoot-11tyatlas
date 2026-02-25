import Feature from "ol/Feature.js";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";

import GeoJSON from "ol/format/GeoJSON.js";
import Circle from "ol/geom/Circle.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";

import MVT from "ol/format/MVT.js";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorTileSource from "ol/source/VectorTile.js";
// import { TileGrid } from 'ol/tilegrid'
// import {get as getProjection} from 'ol/proj.js';

import CircleStyle from "ol/style/Circle.js";
import Fill from "ol/style/Fill.js";
import Stroke from "ol/style/Stroke.js";
import Style from "ol/style/Style.js";

const image = new CircleStyle({
  radius: 5,
  fill: null,
  stroke: new Stroke({ color: "red", width: 1 }),
});

const styles = {
  Point: new Style({
    image: image,
  }),
  LineString: new Style({
    stroke: new Stroke({
      color: "green",
      width: 1,
    }),
  }),
  MultiLineString: new Style({
    stroke: new Stroke({
      color: "green",
      width: 1,
    }),
  }),
  MultiPoint: new Style({
    image: image,
  }),
  MultiPolygon: new Style({
    stroke: new Stroke({
      color: "yellow",
      width: 1,
    }),
    fill: new Fill({
      color: "rgba(255, 255, 0, 0.1)",
    }),
  }),
  Polygon: new Style({
    stroke: new Stroke({
      color: "blue",
      lineDash: [4],
      width: 3,
    }),
    fill: new Fill({
      color: "rgba(0, 0, 255, 0.1)",
    }),
  }),
  GeometryCollection: new Style({
    stroke: new Stroke({
      color: "magenta",
      width: 2,
    }),
    fill: new Fill({
      color: "magenta",
    }),
    image: new CircleStyle({
      radius: 10,
      fill: null,
      stroke: new Stroke({
        color: "magenta",
      }),
    }),
  }),
  Circle: new Style({
    stroke: new Stroke({
      color: "red",
      width: 2,
    }),
    fill: new Fill({
      color: "rgba(255,0,0,0.2)",
    }),
  }),
};

const styleFunction = function (feature) {
  return styles[feature.getGeometry().getType()];
};

const geoJSONvectorSource = new VectorSource({
  format: new GeoJSON(),
  url: "./public/blackfoot260224.geojson",
});

const jsonVectorLayer = new VectorLayer({
  source: geoJSONvectorSource,
  style: styleFunction,
});

const vectorLayer = new VectorTileLayer({
  declutter: true,
  source: new VectorTileSource({
    format: new MVT(),
    maxZoom: 10,
    url: "./public/bfdata/{z}/{x}/{y}.pbf",
  }),
  style: styleFunction,
});

const map = new Map({
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    vectorLayer,
  ],
  target: "map",
  view: new View({
    center: [-12208318.4876784570515156, 6293111.3346918858587742],
    zoom: 6,
  }),
});

const featureOverlay = new VectorLayer({
  source: new VectorSource(),
  map: map,
  style: {
    'stroke-color': 'rgba(255, 255, 255, 0.7)',
    'stroke-width': 2,
  },
});

const displayFeatureInfo = function (pixel) {
  const info = document.getElementById("info");
  info.innerHTML = "&nbsp;";
  map.forEachFeatureAtPixel(
    pixel,
    function (feature) {
      const attrs = feature?.values_ ? feature?.values_ : feature?.properties_;
      const listHtml = Object.keys(attrs)
        .map((k) => {
          return `<li>${k}: ${attrs[k]}</li>`;
        })
        .join("");
      info.innerHTML = `<ul>${listHtml}</ul>`;
    },
    {
      hitTolerance: 5,
    },
  );
  // vectorLayer.getFeatures(pixel).then(function (features) {
  //   const feature = features.length ? features[0] : undefined;
  //   const info = document.getElementById("info");
  //   if (features.length) {
  //     console.log('displaying feature info')
  //     const attrs = feature?.values_ ? feature?.values_ : feature?.properties_
  //     const listHtml = Object.keys(attrs)
  //       .map((k) => {
  //         return `<li>${k}: ${attrs[k]}</li>`;
  //       })
  //       .join("");
  //     info.innerHTML = `<ul>${listHtml}</ul>`;
  //   } else {
  //     info.innerHTML = "&nbsp;";
  //   }
  //   // if (feature !== highlight) {
  //   //   if (highlight) {
  //   //     featureOverlay.getSource().removeFeature(highlight);
  //   //   }
  //   //   if (feature) {
  //   //     featureOverlay.getSource().addFeature(feature);
  //   //   }
  //   //   highlight = feature;
  //   // }
  // });
};

map.on("click", function (evt) {
  displayFeatureInfo(evt.pixel);
});

let highlight;
const hoverFeatureInfo = function (pixel) {
  vectorLayer.getFeatures(pixel).then(function (features) {
    const feature = features.length ? features[0] : undefined;
    
    if (feature !== highlight) {
      if (highlight) {
        featureOverlay.getSource().removeFeature(highlight);
      }
      if (feature) {
        featureOverlay.getSource().addFeature(feature);
      }
      highlight = feature;
    }
  });
};

map.on('pointermove', function (evt) {
  if (evt.dragging) {
    return;
  }
  hoverFeatureInfo(evt.pixel);
});
