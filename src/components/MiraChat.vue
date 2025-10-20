<template>
  <div class="mira-vn">
    <!-- Live2D Canvas Container -->
    <div class="mira-vn__avatar-area">
      <canvas ref="canvas" id="live2d-canvas"></canvas>

      <!-- Gradient overlay untuk depth -->
      <div class="mira-vn__avatar-overlay"></div>

      <!-- Debug Controls (optional) -->
      <div class="mira-vn__debug" v-if="showDebug">
        <p>
          <input type="checkbox" id="modelFrames" v-model="showModelFrames" />
          <label for="modelFrames">Model Frames</label>
        </p>
        <p>
          <input type="checkbox" id="hitAreaFrames" v-model="showHitAreaFrames" />
          <label for="hitAreaFrames">Hit Area Frames</label>
        </p>
        <p>Expression: {{ currentExpression }}</p>
        <p>Speaking: {{ isSpeaking }}</p>
      </div>
    </div>

    <button class="mira-vn__game-btn" @click="showMiniGame = true" :aria-label="'Mini Game'">
      🎮
    </button>

    <!-- History Button (Top Right) -->
    <button
      class="mira-vn__history-btn"
      @click="showHistory = !showHistory"
      :aria-label="'Chat History'"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span v-if="answersStore.displayAnswers.length > 1" class="mira-vn__history-badge">
        {{ answersStore.displayAnswers.length }}
      </span>
    </button>

    <!-- Visual Novel Dialog Area -->
    <div class="mira-vn__dialog-area">
      <!-- Character Name Tag -->
      <div class="mira-vn__name-tag">
        <span>MIRA</span>
        <span v-if="isSpeaking" class="mira-vn__speaking-indicator">●</span>
      </div>

      <!-- Dialog Box (hanya menampilkan pesan MIRA terakhir) -->
      <div class="mira-vn__dialog-box">
        <div v-if="isTyping" class="mira-vn__typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p v-else class="mira-vn__dialog-text">
          {{ currentMiraMessage }}
        </p>
      </div>

      <!-- Input Form -->
      <div class="mira-vn__input-wrapper">
        <input
          v-model="prompt"
          type="text"
          placeholder="Ketik balasan kamu..."
          class="mira-vn__input"
          :disabled="isTyping"
          @keydown.enter="onSubmit"
        />
        <button @click="onSubmit" class="mira-vn__send-btn" :disabled="isTyping || !prompt.trim()">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>

    <!-- History Modal/Popup -->
    <transition name="modal-fade">
      <div v-if="showHistory" class="mira-vn__history-modal" @click="showHistory = false">
        <div class="mira-vn__history-content" @click.stop>
          <div class="mira-vn__history-header">
            <h3>Chat History</h3>
            <button class="mira-vn__close-btn" @click="showHistory = false">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="mira-vn__history-messages" ref="historyContainer">
            <div
              v-for="(answer, index) in answersStore.displayAnswers"
              :key="index"
              :class="['mira-vn__history-msg', answer.role === 'assistant' ? 'mira' : 'user']"
            >
              <div class="mira-vn__history-msg-header">
                {{ answer.role === 'assistant' ? 'MIRA' : 'You' }}
              </div>
              <div class="mira-vn__history-msg-bubble">
                {{ answer.content }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <MiniGame
      :is-active="showMiniGame"
      @close="showMiniGame = false"
      @score-update="handleScoreUpdate"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useAnswersStore, humanizeResponse } from '@/stores/answers'
import { getRespondAnswer } from '@/api/index'

import MiniGame from './common/MiniGame.vue'

// Refs
const canvas = ref(null)
const historyContainer = ref(null)
const prompt = ref('')
const showDebug = ref(false)
const showModelFrames = ref(false)
const showHitAreaFrames = ref(false)
const showHistory = ref(false)
const isTyping = ref(false)
const isSpeaking = ref(false)
const currentExpression = ref('default')
const showMiniGame = ref(false)

// Store
const answersStore = useAnswersStore()

// Computed: Ambil pesan MIRA terakhir saja
const currentMiraMessage = computed(() => {
  const miraMessages = answersStore.displayAnswers.filter((msg) => msg.role === 'assistant')
  return miraMessages.length > 0
    ? miraMessages[miraMessages.length - 1].content
    : 'Halo! Aku MIRA, temen ngobrol kamu. Ada yang mau diceritain?'
})

// Live2D Variables
let PIXI = null
let live2d = null
let app = null
let model = null
let lipSyncInterval = null

const modelUrl =
  'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json'

// Expression Mapping
const expressionMap = {
  happy: ['senang', 'haha', 'wkwk', 'lucu', 'mantap', 'seru'],
  sad: ['sedih', 'galau', 'down', 'nangis'],
  surprised: ['wow', 'gila', 'astaga', 'serius', 'beneran'],
  default: ['happy'],
}

// ===== DEPENDENCY LOADING =====
function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = url
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${url}`))
    document.head.appendChild(s)
  })
}

async function ensureDependencies() {
  const scripts = [
    'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
    'https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js',
    'https://cdn.jsdelivr.net/npm/pixi.js@6.5.2/dist/browser/pixi.min.js',
    'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/index.min.js',
    'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/extra.min.js',
  ]

  for (const url of scripts) {
    await loadScript(url)
  }

  PIXI = window.PIXI
  live2d = PIXI?.live2d
  if (!PIXI || !live2d) throw new Error('PIXI or pixi-live2d-display failed to load')
}

// ===== LIVE2D SETUP =====
// function makeDraggable(m) {
//   m.buttonMode = true
//   const onDown = (e) => {
//     m.dragging = true
//     m._pointerX = e.data.global.x - m.x
//     m._pointerY = e.data.global.y - m.y
//   }
//   const onMove = (e) => {
//     if (m.dragging) {
//       m.position.x = e.data.global.x - m._pointerX
//       m.position.y = e.data.global.y - m._pointerY
//     }
//   }
//   const onUp = () => (m.dragging = false)

//   m.on('pointerdown', onDown)
//   m.on('pointermove', onMove)
//   m.on('pointerup', onUp)
//   m.on('pointerupoutside', onUp)

//   m._live2d_listeners = { onDown, onMove, onUp }
// }

function addFrame(m) {
  const fg = PIXI.Sprite.from(PIXI.Texture.WHITE)
  fg.width = m.internalModel.width
  fg.height = m.internalModel.height
  fg.alpha = 0.2
  m.addChild(fg)
  m._live2d_frame = fg
  fg.visible = showModelFrames.value
}

function addHitAreaFrames(m) {
  const hitAreaFrames = new live2d.HitAreaFrames()
  m.addChild(hitAreaFrames)
  m._live2d_hitAreaFrames = hitAreaFrames
  hitAreaFrames.visible = showHitAreaFrames.value
}

// ===== LIP SYNC SIMULATION =====
function startLipSync() {
  if (lipSyncInterval) return

  isSpeaking.value = true

  lipSyncInterval = setInterval(() => {
    if (model && model.internalModel) {
      try {
        if (model.internalModel.coreModel) {
          const mouthParam = model.internalModel.coreModel.getParamIndex('PARAM_MOUTH_OPEN_Y')
          if (mouthParam !== -1) {
            const randomValue = Math.random() * 0.8 + 0.2
            model.internalModel.coreModel.setParamFloat(mouthParam, randomValue)
          }
        } else if (model.internalModel.setParameterValueById) {
          model.internalModel.setParameterValueById('ParamMouthOpenY', Math.random() * 0.8 + 0.2)
        }
      } catch (e) {
        console.warn('Lip sync parameter not found:', e)
      }
    }
  }, 100)
}

function stopLipSync() {
  if (lipSyncInterval) {
    clearInterval(lipSyncInterval)
    lipSyncInterval = null
  }

  isSpeaking.value = false

  if (model && model.internalModel) {
    try {
      if (model.internalModel.coreModel) {
        const mouthParam = model.internalModel.coreModel.getParamIndex('PARAM_MOUTH_OPEN_Y')
        if (mouthParam !== -1) {
          model.internalModel.coreModel.setParamFloat(mouthParam, 0)
        }
      } else if (model.internalModel.setParameterValueById) {
        model.internalModel.setParameterValueById('ParamMouthOpenY', 0)
      }
    } catch (e) {
      // ignore
    }
  }
}

// ===== EXPRESSION CONTROL =====
function setExpression(expressionName) {
  if (!model) return

  try {
    currentExpression.value = expressionName

    if (expressionName === 'default') {
      model.expression()
    } else {
      model.expression(expressionName)
    }
  } catch (e) {
    model.expression()
  }
}

function detectExpression(text) {
  const lowerText = text.toLowerCase()

  for (const [expression, keywords] of Object.entries(expressionMap)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return expression
    }
  }

  return 'default'
}

const onSubmit = async () => {
  if (prompt.value.trim() === '' || isTyping.value) return

  const userMessage = prompt.value

  // 🦀 WASM-powered mood detection
  await answersStore.adjustMoodContext(userMessage)
  console.log('Current mood:', answersStore.currentMood)

  answersStore.addAnswer('user', userMessage)
  prompt.value = ''

  isTyping.value = true

  try {
    const response = await getRespondAnswer(answersStore.getMessagesWithMood())
    let assistantMessage = response.choices[0].message.content

    // 🦀 WASM-powered humanize
    assistantMessage = await humanizeResponse(assistantMessage)

    // 🦀 WASM-powered expression detection (sentiment-aware)
    const detectedExpression = await answersStore.detectExpression(assistantMessage)
    setExpression(detectedExpression)

    startLipSync()

    const speakingDuration = Math.min(assistantMessage.length * 50, 3000)

    setTimeout(
      () => {
        answersStore.addAnswer('assistant', assistantMessage)
        isTyping.value = false

        setTimeout(() => {
          stopLipSync()
        }, 500)
      },
      Math.max(speakingDuration, 1000),
    )
  } catch (error) {
    console.error('Error:', error)
    isTyping.value = false
    stopLipSync()

    // 🦀 Use WASM offline response
    const offlineMessage = await answersStore.getOfflineResponse()
    answersStore.addAnswer('assistant', 'Ups, connection error nih. Coba lagi ya?')
    setExpression('surprised')
  }
}

onMounted(async () => {
  // Initialize WASM first
  await answersStore.initializeWasm()
  console.log('WASM enabled:', answersStore.wasmEnabled)

  const savedTopics = sessionStorage.getItem('mira_topics')
  if (savedTopics) {
    console.log('📚 Loaded topics:', JSON.parse(savedTopics))
  }

  try {
    await ensureDependencies()

    app = new PIXI.Application({
      view: canvas.value,
      autoStart: true,
      width: window.innerWidth,
      height: window.innerHeight * 0.7,
      backgroundColor: 0xf2dfdf,
      transparent: false,
    })

    model = await live2d.Live2DModel.from(modelUrl)
    app.stage.addChild(model)

    const scaleX = (window.innerWidth * 0.5) / model.width
    const scaleY = (window.innerHeight * 0.5) / model.height
    model.scale.set(Math.min(scaleX, scaleY))

    model.x = window.innerWidth / 2 - model.width / 2
    model.y = window.innerHeight * 0.05

    // makeDraggable(model)
    addFrame(model)
    addHitAreaFrames(model)
    model.interactive = true

    model.on('hit', (hitAreas) => {
      if (hitAreas.includes('body') || hitAreas.includes('Body')) {
        try {
          model.motion('tap_body')
          setExpression('happy')
        } catch (e) {
          model.motion()
        }
      }
      if (hitAreas.includes('head') || hitAreas.includes('Head')) {
        model.expression()
      }
    })

    const handleResize = () => {
      if (app) {
        app.renderer.resize(window.innerWidth, window.innerHeight * 0.7)
        if (model) {
          model.x = window.innerWidth / 2 - model.width / 2
        }
      }
    }
    window.addEventListener('resize', handleResize)
  } catch (err) {
    console.error('Failed to initialize:', err)
  }
})

watch(
  () => answersStore.displayAnswers,
  async (answers) => {
    if (answers.length > 5 && answersStore.wasmEnabled) {
      try {
        const messages = answers.map((a) => a.content)
        const topics = await answersStore.extractTopics(messages)
        sessionStorage.setItem('mira_topics', JSON.stringify(topics))
        console.log('📚 Topics updated:', topics)
      } catch (error) {
        console.warn('Topic extraction failed:', error)
      }
    }
  },
  { deep: true },
)

onBeforeUnmount(() => {
  stopLipSync()

  if (model) {
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
  }

  if (app) {
    app.destroy(true, { children: true, texture: true, baseTexture: true })
    app = null
  }
})

// Watch untuk debug controls
watch(showModelFrames, (v) => {
  if (model?._live2d_frame) model._live2d_frame.visible = v
})

watch(showHitAreaFrames, (v) => {
  if (model?._live2d_hitAreaFrames) model._live2d_hitAreaFrames.visible = v
})

// Auto scroll history saat dibuka
watch(showHistory, async (newVal) => {
  if (newVal) {
    await nextTick()
    if (historyContainer.value) {
      historyContainer.value.scrollTop = historyContainer.value.scrollHeight
    }
  }
})

function handleScoreUpdate(score) {
  console.log('🎮 Game score:', score)

  // Optional: MIRA bisa kasih komen soal score
  if (score.streak >= 3) {
    answersStore.addAnswer('assistant', `Wah streak ${score.streak}! Kamu jago banget! 🔥`)
  }
}
</script>

<style lang="scss" scoped>
.mira-vn {
  position: relative;
  width: 100%;
  height: 100vh;
  // background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  overflow: hidden;

  // ===== AVATAR AREA =====
  &__avatar-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 70%;
    overflow: hidden;

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  }

  &__avatar-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 40%;
    // background: linear-gradient(to top, rgba(22, 33, 62, 0.95) 0%, transparent 100%);
    pointer-events: none;
  }

  // ===== DEBUG =====
  &__debug {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.75rem;
    border-radius: 8px;
    color: #fff;
    font-size: 0.875rem;
    z-index: 5;

    p {
      margin: 0.25rem 0;

      label {
        margin-left: 0.5rem;
      }
    }
  }

  // ===== HISTORY BUTTON =====
  &__history-btn {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--accent-color);
    border: none;
    color: var(--bg-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    z-index: 10;

    &:hover {
      transform: scale(1.1);
      // background: var(--accent-color-2);
    }
  }

  .mira-vn__game-btn {
    position: absolute;
    top: 1.5rem;
    right: 5rem; // Sebelah kiri history button
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    // box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
    transition: all 0.3s ease;
    z-index: 10;

    &:hover {
      transform: scale(1.1) rotate(10deg);
    }
  }

  &__history-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: var(--accent-color-3);
    color: var(--bg-color);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 20px;
    text-align: center;
  }

  // ===== DIALOG AREA (VISUAL NOVEL STYLE) =====
  &__dialog-area {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 2rem;
    z-index: 5;
  }

  &__name-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--accent-color);
    color: var(--bg-color);
    padding: 0.5rem 1.5rem;
    border-radius: 12px 12px 0 0;
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 1px;
    // box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.2);
  }

  &__speaking-indicator {
    animation: pulse 1.5s ease-in-out infinite;
    color: var(--bg-color);
  }

  &__dialog-box {
    background: var(--bg-color);
    backdrop-filter: blur(10px);
    border: 2px solid var(--accent-color);
    border-radius: 0 20px 20px 20px;
    padding: 1.5rem 2rem;
    min-height: 120px;
    display: flex;
    align-items: center;
    // box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    margin-bottom: 1rem;
  }

  &__dialog-text {
    color: var(--text-color);
    font-size: 1rem;
    line-height: 1.6;
    margin: 0;
    animation: fadeIn 0.5s ease;
  }

  &__typing-indicator {
    display: flex;
    gap: 0.5rem;
    align-items: center;

    span {
      width: 10px;
      height: 10px;
      background: var(--text-color);
      border-radius: 50%;
      animation: typing 1.4s infinite;

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  // ===== INPUT =====
  &__input-wrapper {
    display: flex;
    gap: 1rem;
  }

  &__input {
    flex: 1;
    background: var(--bg-color);
    border: 2px solid var(--accent-color);
    color: var(--text-color);
    font-size: 1rem;
    padding: 1rem 1.5rem;
    border-radius: 16px;
    // box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transition: all 0.3s ease;

    &::placeholder {
      color: var(--accent-color);
    }

    &:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.15);
      border-color: var(--accent-color-2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__send-btn {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--accent-color);
    border: none;
    color: var(--bg-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    // box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);

    &:hover:not(:disabled) {
      transform: scale(1.1);
    }

    &:disabled {
      // opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // ===== HISTORY MODAL =====
  &__history-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgb(from var(--bg-color) r g b / 0.6);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  &__history-content {
    background: var(--bg-color);
    border: 2px solid var(--accent-color);
    border-radius: 20px;
    width: 100%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    // box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  &__history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 2px solid var(--accent-color);

    h3 {
      color: var(--text-color);
      margin: 0;
      font-size: 1.5rem;
    }
  }

  &__close-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent-color);
    border: none;
    color: var(--bg-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;

    &:hover {
      background: var(--accent-color-3);
    }
  }

  &__history-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(102, 126, 234, 0.5);
      border-radius: 4px;

      &:hover {
        background: rgba(102, 126, 234, 0.7);
      }
    }
  }

  &__history-msg {
    display: flex;
    flex-direction: column;
    max-width: 80%;

    &.mira {
      align-self: flex-start;
    }

    &.user {
      align-self: flex-end;
    }
  }

  &__history-msg-header {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.5rem;
    padding: 0 0.5rem;
  }

  &__history-msg-bubble {
    padding: 0.875rem 1.25rem;
    border-radius: 16px;
    line-height: 1.5;
    font-size: 0.95rem;
    word-wrap: break-word;

    .mira & {
      background: var(--accent-color);
      color: var(--bg-color);
      border-bottom-left-radius: 4px;
    }

    .user & {
      background: var(--accent-color);
      color: var(--bg-color);
      border-bottom-right-radius: 4px;
    }
  }
}

// ===== ANIMATIONS =====
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

// Modal transitions
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

// ===== RESPONSIVE =====
@media (max-width: 768px) {
  .mira-vn {
    &__avatar-area {
      height: 60%;
    }

    &__dialog-area {
      padding: 1rem;
    }

    &__dialog-box {
      padding: 1rem 1.5rem;
      min-height: 100px;
    }

    &__dialog-text {
      font-size: 1rem;
    }

    &__history-content {
      max-width: 100%;
      max-height: 90vh;
    }

    &__history-msg {
      max-width: 90%;
    }
  }
}
</style>
