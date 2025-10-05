<template>
  <div class="live2d-container">
    <canvas ref="canvas" id="canvas"></canvas>

    <div id="control">
      <p>
        <input type="checkbox" id="modelFrames" v-model="showModelFrames" />
        <label for="modelFrames">Model Frames</label>
      </p>
      <p>
        <input type="checkbox" id="hitAreaFrames" v-model="showHitAreaFrames" />
        <label for="hitAreaFrames">Hit Area Frames</label>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const canvas = ref(null)
const showModelFrames = ref(true)
const showHitAreaFrames = ref(true)

// model urls (same as original)
const cubism2Model =
  'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json'
// const cubism4Model =
//   'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'

let PIXI = null
let live2d = null
let app = null
let models = []

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      // already loaded
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = url
    s.onload = () => resolve()
    s.onerror = (e) => reject(new Error(`Failed to load ${url}`))
    document.head.appendChild(s)
  })
}

async function ensureDependencies() {
  // load external scripts in the order needed
  const scripts = [
    'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
    'https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js',
    'https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js',
    'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js',
    'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/extra.min.js',
  ]

  for (const url of scripts) {
    // eslint-disable-next-line no-await-in-loop
    await loadScript(url)
  }

  // after loading, set globals
  PIXI = window.PIXI
  live2d = PIXI?.live2d
  if (!PIXI || !live2d) throw new Error('PIXI or pixi-live2d-display failed to load')
}

function makeDraggable(model) {
  model.buttonMode = true
  const onDown = (e) => {
    model.dragging = true
    model._pointerX = e.data.global.x - model.x
    model._pointerY = e.data.global.y - model.y
  }
  const onMove = (e) => {
    if (model.dragging) {
      model.position.x = e.data.global.x - model._pointerX
      model.position.y = e.data.global.y - model._pointerY
    }
  }
  const onUp = () => (model.dragging = false)

  model.on('pointerdown', onDown)
  model.on('pointermove', onMove)
  model.on('pointerup', onUp)
  model.on('pointerupoutside', onUp)

  // store listeners so we can remove them on destroy
  model._live2d_listeners = { onDown, onMove, onUp }
}

function addFrame(model) {
  const fg = PIXI.Sprite.from(PIXI.Texture.WHITE)
  fg.width = model.internalModel.width
  fg.height = model.internalModel.height
  fg.alpha = 0.2
  model.addChild(fg)
  model._live2d_frame = fg
  fg.visible = showModelFrames.value
}

function addHitAreaFrames(model) {
  const hitAreaFrames = new live2d.HitAreaFrames()
  model.addChild(hitAreaFrames)
  model._live2d_hitAreaFrames = hitAreaFrames
  hitAreaFrames.visible = showHitAreaFrames.value
}

onMounted(async () => {
  try {
    await ensureDependencies()

    app = new PIXI.Application({
      view: canvas.value,
      autoStart: true,
      resizeTo: window,
      backgroundColor: 0x333333,
    })

    // increase EventEmitter max listeners to avoid repeated MaxListeners warnings
    try {
      // in some environments this might not exist; guard it
      // eslint-disable-next-line no-undef
      if (typeof require === 'function') {
        // try to set Node's default if present (may be ignored in browser)
        const events = window?.require?.('events') || null
        if (events && events.EventEmitter) events.EventEmitter.defaultMaxListeners = 50
      }
    } catch (e) {
      // ignore
    }

    // load models
    models = await Promise.all([
      live2d.Live2DModel.from(cubism2Model),
      //   live2d.Live2DModel.from(cubism4Model),
    ])

    models.forEach((model) => {
      app.stage.addChild(model)

      const scaleX = (innerWidth * 0.4) / model.width
      const scaleY = (innerHeight * 0.8) / model.height

      model.scale.set(Math.min(scaleX, scaleY))
      model.y = innerHeight * 0.1

      makeDraggable(model)
      addFrame(model)
      addHitAreaFrames(model)

      // wiring hit events similar to original
      model.on('hit', (hitAreas) => {
        if (hitAreas.includes('body') || hitAreas.includes('Body')) {
          try {
            model.motion('tap_body')
          } catch (e) {
            // some models use different motion names
            model.motion()
          }
        }
        if (hitAreas.includes('head') || hitAreas.includes('Head')) {
          model.expression()
        }
      })

      // enable interactivity
      model.interactive = true
    })

    const model2 = models[0]
    const model4 = models[1]

    model2.x = (innerWidth - model2.width - model4.width) / 2
    model4.x = model2.x + model2.width
  } catch (err) {
    // graceful error handling (you can display a UI message instead)
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Live2D viewer:', err)
  }
})

onBeforeUnmount(() => {
  try {
    // remove listeners and destroy models
    models.forEach((model) => {
      if (model._live2d_listeners) {
        model.off('pointerdown', model._live2d_listeners.onDown)
        model.off('pointermove', model._live2d_listeners.onMove)
        model.off('pointerup', model._live2d_listeners.onUp)
        model.off('pointerupoutside', model._live2d_listeners.onUp)
      }
      try {
        model.destroy({ children: true, texture: true, baseTexture: true })
      } catch (e) {
        // ignore
      }
    })

    if (app) {
      app.destroy(true, { children: true, texture: true, baseTexture: true })
      app = null
    }
  } catch (e) {
    // ignore cleanup errors
  }
})

// watch checkboxes to toggle visibility
watch(showModelFrames, (v) => {
  models.forEach((m) => {
    if (m._live2d_frame) m._live2d_frame.visible = v
  })
})

watch(showHitAreaFrames, (v) => {
  models.forEach((m) => {
    if (m._live2d_hitAreaFrames) m._live2d_hitAreaFrames.visible = v
  })
})
</script>

<style lang="scss" scoped>
.live2d-container {
  position: relative;
  width: 100%;
  height: 100vh;
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  #control {
    position: absolute;
    top: 8px;
    left: 24px;
    color: white;
    font-size: 18px;

    p {
      margin: 0 0 6px 0;
      label {
        margin-left: 6px;
      }
    }
  }
}
</style>
