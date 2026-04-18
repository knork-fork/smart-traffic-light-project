
const CAR_COLORS_ON         = ['#ff2200', '#ffaa00', '#00dd44']
const CAR_COLORS_OFF        = ['#4a0a00', '#3d2800', '#003d10']
const PEDESTRIAN_COLORS_ON  = ['#ff2200', '#00dd44']
const PEDESTRIAN_COLORS_OFF = ['#4a0a00', '#003d10']

function toPercent(x, y, bbox) {
  return {
    pctX: (x - bbox.left) / (bbox.right - bbox.left)   * 100,
    pctY: (bbox.top  - y) / (bbox.top   - bbox.bottom) * 100,
  }
}

function createLight(type, heading, id) {
  const colorsOff = type === 'car' ? CAR_COLORS_OFF : PEDESTRIAN_COLORS_OFF

  const anchor = document.createElement('div')
  anchor.className = 'tl-anchor'
  anchor.dataset.id = id

  const body = document.createElement('div')
  body.className = 'tl-body'
  // Center on anchor point then rotate; heading is clockwise from upright
  body.style.transform = `translate(-50%, -50%) rotate(${heading}deg)`

  for (const color of colorsOff) {
    const dot = document.createElement('div')
    dot.className = 'tl-light'
    dot.style.background = color
    body.appendChild(dot)
  }

  anchor.appendChild(body)
  return anchor
}

async function render() {
  const data = await fetch('/map_1649_945.json').then(r => r.json())
  const bbox = data.bounding_box
  const trafficLights = data.traffic_lights

  const container = document.getElementById('map-container')

  for (const [type, lights] of Object.entries(trafficLights)) {
    for (const tl of lights) {
      const { pctX, pctY } = toPercent(tl.x, tl.y, bbox)
      const el = createLight(type, tl.heading, tl.ID)
      el.style.left = `${pctX}%`
      el.style.top  = `${pctY}%`
      container.appendChild(el)
    }
  }
}

render()
