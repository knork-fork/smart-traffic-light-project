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

  const dots = []
  for (const color of colorsOff) {
    const dot = document.createElement('div')
    dot.className = 'tl-light'
    dot.style.background = color
    body.appendChild(dot)
    dots.push(dot)
  }

  anchor.appendChild(body)
  return { anchor, dots }
}

function applyState(state, lights) {
  const greenSet = new Set(state ? state.green : [])

  for (const { id, type, dots } of lights) {
    const isGreen = greenSet.has(id)

    if (type === 'car') {
      dots[0].style.background = isGreen ? CAR_COLORS_OFF[0] : CAR_COLORS_ON[0]
      dots[1].style.background = CAR_COLORS_OFF[1]
      dots[2].style.background = isGreen ? CAR_COLORS_ON[2] : CAR_COLORS_OFF[2]
    } else {
      dots[0].style.background = isGreen ? PEDESTRIAN_COLORS_OFF[0] : PEDESTRIAN_COLORS_ON[0]
      dots[1].style.background = isGreen ? PEDESTRIAN_COLORS_ON[1] : PEDESTRIAN_COLORS_OFF[1]
    }
  }
}

function createControls(stateKeys, onPlay, onSelectState) {
  const bar = document.createElement('div')
  bar.className = 'controls'

  const playBtn = document.createElement('button')
  playBtn.className = 'ctrl-btn ctrl-play active'
  playBtn.textContent = '▶'
  playBtn.addEventListener('click', () => onPlay())
  bar.appendChild(playBtn)

  const stateBtns = stateKeys.map((_, i) => {
    const btn = document.createElement('button')
    btn.className = 'ctrl-btn'
    btn.textContent = i + 1
    btn.addEventListener('click', () => onSelectState(i))
    bar.appendChild(btn)
    return btn
  })

  function setActive(playingIndex) {
    playBtn.classList.toggle('active', playingIndex === null)
    stateBtns.forEach((btn, i) => btn.classList.toggle('active', i === playingIndex))
  }

  return { bar, setActive }
}

async function render() {
  const [mapData, statesMap] = await Promise.all([
    fetch('/map_1649_945.json').then(r => r.json()),
    fetch('/states.json').then(r => r.json()),
  ])

  const { bounding_box: bbox, traffic_lights } = mapData
  const stateKeys = Object.keys(statesMap)
  const states = Object.values(statesMap)
  const container = document.getElementById('map-container')
  const lights = []

  for (const [type, tlList] of Object.entries(traffic_lights)) {
    for (const tl of tlList) {
      const { pctX, pctY } = toPercent(tl.x, tl.y, bbox)
      const { anchor, dots } = createLight(type, tl.heading, tl.ID)
      anchor.style.left = `${pctX}%`
      anchor.style.top  = `${pctY}%`
      container.appendChild(anchor)
      lights.push({ id: tl.ID, type, dots })
    }
  }

  // -1 = empty, 0..N-1 = STATE_001..STATE_N; null interval = paused
  let stateIndex = -1
  let interval = null

  function tick() {
    applyState(stateIndex === -1 ? null : states[stateIndex], lights)
    stateIndex = stateIndex === -1 ? 0 : (stateIndex + 1) % states.length
  }

  function play() {
    if (interval !== null) return
    controls.setActive(null)
    interval = setInterval(tick, 1000)
    tick()
  }

  function pause(index) {
    clearInterval(interval)
    interval = null
    stateIndex = index
    controls.setActive(index)
    applyState(states[index], lights)
  }

  const controls = createControls(stateKeys, play, pause)
  container.appendChild(controls.bar)

  // Start: empty state for 1s then auto-play
  applyState(null, lights)
  setTimeout(() => play(), 1000)
}

render()
