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

const featureCard = document.getElementById('featureCard')

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
  const info = document.getElementById('info')

  let infoHtml = ''
  const pkeys = Object.keys(props)
  if(pkeys.includes('blackfootname')) {
    infoHtml += `<tr><th>Blackfoot Name</th><td>${props.blackfootname}</td></tr>`
  }
  if(pkeys.includes('englishname')) {
    infoHtml += `<tr><th>English Name</th><td>${props.englishname}</td></tr>`
  }
  if(pkeys.includes('literalmeaning')) {
    infoHtml += `<tr><th>Literal Meaning</th><td>${props.literalmeaning}</td></tr>`
  }
  if(props?.refaltname) {
    infoHtml += `<tr><th>Reference</th><td>${props.refaltnames}</td></tr>`
  }
  if(props?.altspelling) {
    infoHtml += `<tr><th>Alt. Spellings</th><td>${props.altspelling}</td></tr>`
  }
  if(props?.altnames) {
    infoHtml += `<tr><th>Alt. Names</th><td>${props.altnames}</td></tr>`
  }
  if(props?.description) {
    infoHtml += `<tr><th>Description</th><td>${props.description}</td></tr>`
  }
  if(pkeys.includes('nunaliit_hoverSound')) {
    console.log('hoversound not handled for ' + id)
  }
  if(pkeys.includes('image')) {
    console.log('image not handled for ' + id)
  }


  let relatedHtml = ''
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
      relatedHtml += `<ul class="list bg-base-100 rounded-box shadow-md my-3">
<li class="p-4 pb-2 text-sm opacity-90 tracking-wide">Archival Material</li>${imageLinks.join('')}</ul>`
    }
    if (types.includes('demo_story')) {
      relatedHtml += '<h3>Stories</h3>'
      const storyParts = await Promise.all(
        relatedRecordsByType['demo_story'].map(async (r) => {
          const insertHtmlResponse = await fetch(`story/${r.tid}_insert.html`)
          return await insertHtmlResponse.text()
        })
      )
      relatedHtml += storyParts.join('')
    }
    if (types.includes('demo_archy')) {
      relatedHtml += '<h3>Archaeology</h3>'
      const parts = await Promise.all(
        relatedRecordsByType['demo_archy'].map(async (r) => {
          const insertHtmlResponse = await fetch(`archaeology/${r.tid}_insert.html`)
          return await insertHtmlResponse.text()
        })
      )
      relatedHtml += parts.join('')
    }
    if (types.includes('demo_doc')) {
      const relatedDocs = await Promise.all(
        relatedRecordsByType['demo_doc'].map(async (r) => {
          const docInfoRes = await fetch(`features/${r.tid}.json`)
          if (!docInfoRes.ok) {
            console.error('Error fetching json file')
          }
          const docInfo = await docInfoRes.json()
          return `<li class="list-row" x-data 
            @mouseenter="$dispatch('hover', '${r.tid}')" @mouseleave="$dispatch('unhover')" @click="$store.feature.select('${r.tid}')">
            <div>
              <div class="font-semibold">${docInfo.blackfootname}</div>
              <div class="text-xs">${docInfo.englishname}</div>
            </div>
          </li>`
        })
      )
      relatedHtml = relatedHtml + `<ul class="list bg-base-100 rounded-box shadow-md">
<li class="p-4 pb-2 text-sm opacity-90 tracking-wide">Related features</li>${relatedDocs.join('')}</ul>`
    }
  }

  const featureTitle = document.getElementById('featureTitle')
  if (props?.blackfootname) {
    featureTitle.innerText = props.blackfootname
  } else {
    featureTitle.innerText = 'Feature Info'
  }
  info.innerHTML = `<table class="table-sm"><tbody>${infoHtml}</tbody></table>${relatedHtml}`
  featureCard.classList.remove('hidden')
}

const closeFeatureInfo = function () {
  Alpine.store('styles').unsetSelected()
  const featureCard = document.getElementById('featureCard')
  featureCard.classList.add('hidden')
  const info = document.getElementById('info')
  info.innerHTML = '&nbsp;'
}

const displayFeatureById = async function(id) {
  console.log(id)
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
    Alpine.store('feature').unselect()
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

Alpine.store('feature', {
  selectedId: -1,
  async select(id) {
    this.selectedId = id
    const docInfoRes = await fetch(`features/${id}.json`)
    const props = docInfoRes.json()
    displayFeatureInfo(id, props)
  },
  unselect() {
    this.selectedId = -1
    closeFeatureInfo()
  }
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
