import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import OSM from 'ol/source/OSM.js'

import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'

import MVT from 'ol/format/MVT.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorTileSource from 'ol/source/VectorTile.js'

import LayerSwitcher from 'ol-layerswitcher'
import { BaseLayerOptions, GroupLayerOptions } from 'ol-layerswitcher'
import WMTS from 'ol/source/WMTS.js'
import WMTSTileGrid from 'ol/tilegrid/WMTS.js'
import { get as getProjection } from 'ol/proj.js'
import { getTopLeft, getWidth } from 'ol/extent.js'

import Styles, { styleFeature } from './styles'
import Alpine from 'alpinejs'
 
const DISPLAY_ATTRIBUTES = ['blackfootname', 'englishname', 'literalmeaning', 'refaltnames', 'altspelling', 'altnames', 'description']


const vectorLayer = new VectorTileLayer({
  declutter: true,
  source: new VectorTileSource({
    format: new MVT({
      idProperty: 'id'
    }),
    maxZoom: 10,
    url: './public/bfdata/{z}/{x}/{y}.pbf'
  }),
  style: Styles.styleFeature
})

const projection = getProjection('EPSG:3857')
const projectionExtent = projection.getExtent()
const size = getWidth(projectionExtent) / 256
const resolutions = new Array(19)
const matrixIds = new Array(19)
for (let z = 0; z < 19; ++z) {
  // generate resolutions and matrixIds arrays for this WMTS
  resolutions[z] = size / Math.pow(2, z)
  matrixIds[z] = z
}

const s2cloudlessLayer = new TileLayer({
  title: 's2cloudless-2024_3857',
  type: 'base',
  visible: false,
  source: new WMTS({
    attributions:
      '<i><a class="a-light" xmlns:dct="http://purl.org/dc/terms/" href="https://s2maps.eu" property="dct:title">Sentinel-2 cloudless - https://s2maps.eu</a> by <a class="a-light" xmlns:cc="http://creativecommons.org/ns#" href="https://eox.at" property="cc:attributionName" rel="cc:attributionURL">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2024)</i>',
    url: 'http://tiles.maps.eox.at/wmts?',
    layer: 's2cloudless-2024_3857',
    matrixSet: 'g',
    format: 'image/jpeg',
    projection: projection,
    tileGrid: new WMTSTileGrid({
      origin: getTopLeft(projectionExtent),
      resolutions: resolutions,
      matrixIds: matrixIds
    }),
    style: 'default',
    wrapX: false
  })
})

const map = new Map({
  layers: [
    s2cloudlessLayer,
    new TileLayer({
      title: 'OSM',
      type: 'base',
      visible: true,
      source: new OSM()
    }),
    vectorLayer
  ],
  target: 'map',
  view: new View({
    center: [-12208318.4876784570515156, 6293111.3346918858587742],
    zoom: 6
  })
})

const displayFeatureInfo = async function (pixel) {
  const featureCard = document.getElementById('featureCard')
  featureCard.classList.add('hidden')
  const info = document.getElementById('info')
  info.innerHTML = '&nbsp;'
  const features = map.getFeaturesAtPixel(pixel, {
    hitTolerance: 5
  })

  if (features.length > 1) {
    console.log('Need to handle multiple features at click point')
  }
  if (features.length > 0) {
    const feature = features[0]
    Styles.setSelectedId(feature.getId())
    const attrs = feature?.values_ ? feature?.values_ : feature?.properties_
    const listHtml = (
      await Promise.all(
        Object.keys(attrs).map(async (k) => {
          if (k === 'nunaliit_relations') {
            const imageLinks = await Promise.all(
              JSON.parse(attrs[k]).map(async (r) => {
                const insertHtmlResponse = await fetch(`media/${r.doc}_insert.html`)
                const insertHtml = await insertHtmlResponse.text()
                return `<li>${insertHtml}</li>`
              })
            )
            return `<li>Archival Material: <ul>${imageLinks.join('')}</ul></li>`
          } else if (DISPLAY_ATTRIBUTES.includes(k)) {
            return `<li>${k}: ${attrs[k]}</li>`
          } else {
            return `<li class="hidden">${k}: ${attrs[k]}</li>`
          }
        })
      )
    ).join('')

    const featureTitle = document.getElementById('featureTitle')
    if (attrs?.blackfootname) {
      featureTitle.innerText = attrs.blackfootname
    } else {
      featureTitle.innerText = 'Feature Info'
    }
    info.innerHTML = `<ul>${listHtml}</ul>`

    if (Object.keys(attrs).includes()) {
      links
      info.innerHTML = `<ul>${listHtml}</ul>`
    }
    featureCard.classList.remove('hidden')
  } else {
    Styles.setSelectedId(-1)
  }
  vectorLayer.changed()
}

const layerSwitcher = new LayerSwitcher({
  reverse: true,
  groupSelectStyle: 'group'
})
map.addControl(layerSwitcher)

map.on('click', function (evt) {
  displayFeatureInfo(evt.pixel)
})

const hoverFeatureInfo = function (pixel) {
  const features = map.getFeaturesAtPixel(pixel, {
    hitTolerance: 3
  })
  if (features.length == 0) {
    Styles.setHoverId(-1)
    vectorLayer.changed()
  } else if (Styles.getHoverId() != features[0].getId()) {
    Styles.setHoverId(features[0].getId())
    vectorLayer.changed()
  }
}

map.on('pointermove', function (evt) {
  if (evt.dragging) {
    return
  }
  hoverFeatureInfo(evt.pixel)
})

Alpine.effect(() => {
  const displayed = Alpine.store('styles').display
  vectorLayer.changed()
})



// Styles.fillLegend(vectorLayer)