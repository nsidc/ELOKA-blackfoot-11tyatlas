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
let links = {}

fetch('./public/links.json')
  .then((r) => r.json())
  .then((d) => (links = d))
  .catch((e) => console.error('Error loading links.json'))

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

function groupBy(arr, property) {
  return arr.reduce(function (memo, x) {
    if (!memo[x[property]]) {
      memo[x[property]] = []
    }
    memo[x[property]].push(x)
    return memo
  }, {})
}

const displayFeatureInfo = async function (id, props) {
  Alpine.store('styles').setSelected(id)
  const featureCard = document.getElementById('featureCard')
  const info = document.getElementById('info')

  let listHtml = Object.keys(props)
    .map((k) => {
      if (k === 'nunaliit_relations') {
        return ''
      } else if (DISPLAY_ATTRIBUTES.includes(k)) {
        return `<li>${k}: ${props[k]}</li>`
      } else {
        return `<li class="hidden">${k}: ${props[k]}</li>`
      }
    })
    .join('')

  let storyHtml = ''
  if (links.hasOwnProperty(id)) {
    const relationsObj = links[id]
    const relatedRecordsByType = groupBy(relationsObj, 't')
    const types = Object.keys(relatedRecordsByType)
    if (types.includes('demo_archive')) {
      const imageLinks = await Promise.all(
        relatedRecordsByType['demo_archive'].map(async (r) => {
          const insertHtmlResponse = await fetch(`media/${r.tid}_insert.html`)
          const insertHtml = await insertHtmlResponse.text()
          return `<li>${insertHtml}</li>`
        })
      )
      listHtml = listHtml + `<li>Archival Material: <ul>${imageLinks.join('')}</ul></li>`
    }
    if (types.includes('demo_story')) {
      storyHtml += '<h3>Stories</h3>'
      const storyParts = await Promise.all(
        relatedRecordsByType['demo_story'].map(async (r) => {
          const insertHtmlResponse = await fetch(`story/${r.tid}_insert.html`)
          return await insertHtmlResponse.text()
        })
      )
      storyHtml += storyParts.join('')
    }
    if (types.includes('demo_doc')) {
      const relatedDocs = relatedRecordsByType['demo_doc'].map(
        (r) => `<p x-data @mouseenter="$dispatch('hover', '${r.tid}')" @mouseleave="$dispatch('unhover')">${r.tid}</p>`
      )
      listHtml = listHtml + `<li>Related docs: <ul>${relatedDocs.join('')}</ul></li>`
    }
  }

  const featureTitle = document.getElementById('featureTitle')
  if (props?.blackfootname) {
    featureTitle.innerText = props.blackfootname
  } else {
    featureTitle.innerText = 'Feature Info'
  }
  info.innerHTML = `<ul>${listHtml}</ul>${storyHtml}`

  if (Object.keys(props).includes()) {
    links
    info.innerHTML = `<ul>${listHtml}</ul>${storyHtml}`
  }
  featureCard.classList.remove('hidden')
}

const closeFeatureInfo = function () {
  Alpine.store('styles').unsetSelected()
  const featureCard = document.getElementById('featureCard')
  featureCard.classList.add('hidden')
  const info = document.getElementById('info')
  info.innerHTML = '&nbsp;'
}

const displayFeatureAtPixel = async function (pixel) {
  const features = map.getFeaturesAtPixel(pixel, {
    hitTolerance: 5
  })

  if (features.length > 1) {
    console.log('Need to handle multiple features at click point')
  }
  if (features.length > 0) {
    const feature = features[0]
    const featureInfo = feature.getProperties()
    displayFeatureInfo(feature.getId(), featureInfo)
  } else {
    Alpine.store('styles').unsetSelected()
  }
}

const layerSwitcher = new LayerSwitcher({
  reverse: true,
  groupSelectStyle: 'group',
  activationMode: 'click'
})
map.addControl(layerSwitcher)

map.on('click', function (evt) {
  displayFeatureAtPixel(evt.pixel)
})

const hoverFeatureInfo = function (pixel) {
  const features = map.getFeaturesAtPixel(pixel, {
    hitTolerance: 3
  })
  if (features.length == 0) {
    Alpine.store('styles').unsetHover()
  } else {
    //if (Styles.getHoverId() != features[0].getId()) {
    Alpine.store('styles').setHover(features[0].getId())
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

Alpine.effect(() => {
  const hoverId = Alpine.store('styles').hoverId
  vectorLayer.changed()
})

Alpine.effect(() => {
  const selectedId = Alpine.store('styles').selectedId
  vectorLayer.changed()
})

// Styles.fillLegend(vectorLayer)
