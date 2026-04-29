import { LineString, Point, Polygon } from 'ol/geom'
import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'

import Alpine from 'alpinejs'
import { toContext } from 'ol/render'
import VectorContext from 'ol/render/VectorContext'

const styles = {
  water: {
    title: 'Water',
    styles: {
      Point: new Style({
        image: new CircleStyle({
          radius: 3,
          fill: new Fill({ color: '#66CCEE', width: 1 }),
          stroke: new Stroke({ color: '#66CCEE', width: 1 })
        })
      }),
      Line: new Style({
        stroke: new Stroke({
          color: '#66CCEE',
          width: 2
        })
      }),
      Polygon: new Style({
        stroke: new Stroke({
          color: '#66CCEE',
          width: 1
        }),
        fill: new Fill({
          color: 'rgb(102, 204, 238, .8)'
        })
      })
    }
  },
  towns: {
    title: 'Towns, Agencies and Forts',
    styles: {
      Point: new Style({
        image: new CircleStyle({
          radius: 3,
          fill: new Fill({ color: '#CCBB44', width: 1 }),
          stroke: new Stroke({ color: '#CCBB44', width: 1 })
        })
      }),
      Line: new Style({
        stroke: new Stroke({
          color: '#CCBB44',
          width: 2
        })
      }),
      Polygon: new Style({
        stroke: new Stroke({
          color: '#CCBB44',
          width: 1
        }),
        fill: new Fill({
          color: '#CCBB44'
        })
      })
    }
  },
  upland: {
    title: 'Uplands and Peaks',
    styles: {
      Point: new Style({
        image: new CircleStyle({
          radius: 3,
          fill: new Fill({ color: '#BBBBBB', width: 1 }),
          stroke: new Stroke({ color: '#BBBBBB', width: 1 })
        })
      }),
      Line: new Style({
        stroke: new Stroke({
          color: '#BBBBBB',
          width: 2
        })
      }),
      Polygon: new Style({
        stroke: new Stroke({
          color: '#BBBBBB',
          width: 1
        }),
        fill: new Fill({
          color: '#BBBBBB'
        })
      })
    }
  },
  routes: {
    title: 'Trails',
    styles: {
      Line: new Style({
        stroke: new Stroke({
          color: '#000000',
          width: 2
        })
      })
    }
  },
  public_sites: {
    title: 'Pre-Contact Archaeology',
    styles: {
      Point: new Style({
        image: new CircleStyle({
          radius: 3,
          fill: new Fill({ color: '#EE6677', width: 1 }),
          stroke: new Stroke({ color: '#EE6677', width: 1 })
        })
      })
    }
  }
}

const hoverImg = new CircleStyle({
  radius: 4,
  fill: null,
  stroke: new Stroke({ color: 'yellow', width: 3 })
})

const hoverStyles = {
  Point: new Style({
    image: hoverImg
  }),
  Line: new Style({
    stroke: new Stroke({
      color: '#992f9b',
      width: 3
    })
  }),
  Polygon: new Style({
    stroke: new Stroke({
      color: '#992f9b',
      width: 2
    }),
    fill: new Fill({
      color: 'rgb(153, 47, 155, .6)'
    })
  })
}

const selectedStyles = {
  Point: new Style({
    image: hoverImg
  }),
  Line: new Style({
    stroke: new Stroke({
      color: '#9d1010',
      width: 3
    })
  }),
  Polygon: new Style({
    stroke: new Stroke({
      color: '#9d1010',
      width: 2
    }),
    fill: new Fill({
      color: 'rgb(157, 16, 16, .5)'
    })
  })
}

const getGenericType = function (feature) {
  const t = feature.getGeometry().getType()
  if (t == 'Point') {
    return t
  } else if (t.includes('Line')) {
    return 'Line'
  } else if (t.includes('Polygon')) {
    return 'Polygon'
  } else {
    console.error(`Unknown type: ${t}`)
    return 'Unknown'
  }
}

let missingFeatures = new Set()

const styleFeature = function (feature) {
  const layersString = feature.getProperties()?.layers
  if(!layersString) {
    // console.log('Feature does not have layer string')
    // console.log(feature)
    return new Style({})
  }
  const type = layersString.substring(3, layersString.length - 1)
  const displayed = Alpine.store('styles').display
  if (feature.getId() == Alpine.store('styles').selectedId) {
    return selectedStyles[getGenericType(feature)]
  } else if (feature.getId() == Alpine.store('styles').hoverId) {
    return hoverStyles[getGenericType(feature)]
  } else if (!displayed.includes(type)) {
    //this removes the feature
    return new Style({})
  }

  const s = styles[type]?.styles[getGenericType(feature)]
  if (s) {
    return s
  }

  missingFeatures.add(feature.getId())
  // console.log(`No style for id ${feature.getId()} to type ${type}, geotype ${getGenericType(feature)}`)
  return new Style({})
}

const fillLegend = function (layer) {
  // const legendList = document.getElementById('legend-list')
  // legendList.innerHTML = ''
  // for(const entry in styles) {
  // }
  // const s = layer.getSource()
  // console.log(s)
  // const features = s.getFeatures()
  // for(f in features) {
  //     console.log(styleFeature(f))
  // }
}

window.Alpine = Alpine
Alpine.store('styles', {
  data: styles,
  display: Object.keys(styles),
  hoverId: -1,
  selectedId: -1,
  entries() {
    return Object.keys(this.data)
  },
  count() {
    return Object.keys(this.data).length
  },
  setHover(id) {
    if(id != this.hoverId) {
      this.hoverId = id
    }
  },
  unsetHover() {
    this.hoverId = -1
  },
  setSelected(id) {
    if(id != this.selectedId) {
      this.selectedId = id
    }
  },
  unsetSelected() {
    this.selectedId = -1
  },
  drawLegendShapes(entry, canvas) {
    const vectorContext = toContext(canvas.getContext('2d'), { size: [60, 20] })
    if (entry.styles.Point) {
      vectorContext.setStyle(entry.styles.Point)
      vectorContext.drawGeometry(new Point([10, 10]))
    }
    if (entry.styles.Line) {
      vectorContext.setStyle(entry.styles.Line)
      vectorContext.drawGeometry(
        new LineString([
          [22, 15],
          [25, 13],
          [28, 10],
          [33, 10],
          [35, 7],
          [38, 5]
        ])
      )
    }
    if (entry.styles.Polygon) {
      vectorContext.setStyle(entry.styles.Polygon)
      vectorContext.drawGeometry(
        new Polygon([
          [
            [47, 2],
            [58, 2],
            [53, 18],
            [42, 18],
            [47, 2]
          ]
        ])
      )
    }
  }
})

Alpine.start()

export default { fillLegend, styleFeature, styles }
export { fillLegend, styleFeature, styles }
