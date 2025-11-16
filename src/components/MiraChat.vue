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
        <p>
          Expression: {{ currentExpression }} ({{ expressionBlend?.blendStrength?.toFixed(2) }})
        </p>
        <p>Mood: {{ answersStore.currentMood }} (Intensity: {{ emotionIntensity.toFixed(2) }})</p>
        <p>Speaking: {{ isSpeaking }}</p>
      </div>
    </div>

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

    <!-- Toast Notification -->
    <transition name="toast-slide">
      <div v-if="toast.visible" :class="['mira-vn__toast', `mira-vn__toast--${toast.type}`]">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useAnswersStore, humanizeResponse } from '@/stores/answers'
import { getRespondAnswer } from '@/api/index'

// ========== REFS ==========
const canvas = ref(null)
const historyContainer = ref(null)
const prompt = ref('')
const showDebug = ref(false)
const showModelFrames = ref(false)
const showHitAreaFrames = ref(false)
const showHistory = ref(false)
const isTyping = ref(false)
const isSpeaking = ref(false)
const currentExpression = ref('f01')
const emotionIntensity = ref(0)
const expressionBlend = ref(null)

// Animation loop
let animationFrameId = null
let isAnimating = false

// Store
const answersStore = useAnswersStore()

// ========== TOAST NOTIFICATION SYSTEM ==========
const toast = ref({
  message: '',
  type: 'info', // 'info', 'warning', 'error', 'success'
  visible: false,
})

function showToast(message, type = 'info', duration = 2500) {
  toast.value = { message, type, visible: true }
  console.log(`📢 Toast [${type}]: ${message}`)
  setTimeout(() => {
    toast.value.visible = false
  }, duration)
}

// ========== COMPUTED ==========
const currentMiraMessage = computed(() => {
  const miraMessages = answersStore.displayAnswers.filter((msg) => msg.role === 'assistant')
  return miraMessages.length > 0
    ? miraMessages[miraMessages.length - 1].content
    : 'Halo! Aku MIRA, temen ngobrol kamu. Ada yang mau diceritain?'
})

// ========== LIVE2D SETUP ==========
let PIXI = null
let live2d = null
let app = null
let model = null

const modelUrl =
  'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json'

// ========== EXPRESSION TRANSITION SYSTEM ==========
class ExpressionTransition {
  constructor(fromExpression, toExpression, durationMs = 300) {
    this.fromExpression = fromExpression
    this.toExpression = toExpression
    this.duration = durationMs
    this.startTime = Date.now()
    this.isComplete = false
  }

  // Cubic easing (ease-in-out-cubic)
  easeCubic(t) {
    if (t < 0.5) {
      return 4 * t * t * t
    } else {
      return 1 - Math.pow(-2 * t + 2, 3) / 2
    }
  }

  update(currentTime) {
    const elapsed = currentTime - this.startTime
    const progress = Math.min(elapsed / this.duration, 1.0)

    // Apply cubic easing
    const easedProgress = this.easeCubic(progress)

    if (progress >= 1.0) {
      this.isComplete = true
      return { targetExpression: this.toExpression, blendProgress: 1.0 }
    }

    return {
      targetExpression: this.toExpression,
      blendProgress: easedProgress,
    }
  }
}

let activeTransition = null
const expressionQueue = ref([])

// ========== OPTIMIZED EXPRESSION QUEUE ==========
class OptimizedExpressionQueue {
  constructor(maxSize = 5) {
    this.queue = []
    this.maxSize = maxSize
  }

  enqueue(expression, duration = 300) {
    // Jangan add duplicate ekspresi yang sama berturut-turut
    if (this.queue.length > 0) {
      const lastItem = this.queue[this.queue.length - 1]
      if (lastItem.expression === expression) {
        lastItem.duration = Math.max(lastItem.duration, duration)
        console.log('🎭 Expression updated (deduplicate):', expression)
        return
      }
    }

    // Jika queue penuh, hapus yang paling lama
    if (this.queue.length >= this.maxSize) {
      const removed = this.queue.shift()
      console.warn('🎭 Queue full, removed oldest:', removed.expression)
    }

    this.queue.push({ expression, duration })
    console.log('🎭 Expression queued:', expression, '| Queue size:', this.queue.length)
  }

  dequeue() {
    return this.queue.shift()
  }

  isEmpty() {
    return this.queue.length === 0
  }

  size() {
    return this.queue.length
  }
}

// Initialize queue
const expressionQueueManager = new OptimizedExpressionQueue(5)

function queueExpression(newExpression, durationMs = 300) {
  if (activeTransition && !activeTransition.isComplete) {
    expressionQueueManager.enqueue(newExpression, durationMs)
  } else {
    const fromExpr = currentExpression.value
    activeTransition = new ExpressionTransition(fromExpr, newExpression, durationMs)
    console.log(`🎭 Transition started: ${fromExpr} → ${newExpression}`)
  }
}

function updateExpressions() {
  if (activeTransition && !activeTransition.isComplete) {
    const now = Date.now()
    const state = activeTransition.update(now)

    // Set expression saat progress >= 0.9 (untuk smooth transition)
    if (state.blendProgress >= 0.9) {
      setExpressionDirect(state.targetExpression)
    }

    if (activeTransition.isComplete) {
      setExpressionDirect(activeTransition.toExpression)
      currentExpression.value = activeTransition.toExpression
      console.log('🎭 Expression transition complete:', activeTransition.toExpression)
      activeTransition = null

      // Process queued expressions
      if (!expressionQueueManager.isEmpty()) {
        const next = expressionQueueManager.dequeue()
        queueExpression(next.expression, next.duration)
      }
    }
  }
}

// ========== LIP SYNC ENHANCEMENT ==========
let lipSyncInterval = null

function calculateSpeakingDuration(text, baseWPM = 160) {
  const wordCount = text.trim().split(/\s+/).length
  const baseDuration = (wordCount / baseWPM) * 60000

  // Add variance untuk natural feel (±10%)
  const variance = Math.random() * 0.2 - 0.1
  return Math.max(baseDuration * (1 + variance), 1000)
}

function calculateOptimalLipSyncDuration(text) {
  // Indonesian average WPM = 140 (slightly faster than English)
  const indonesianAvgWPM = 140
  const wordCount = text.trim().split(/\s+/).length

  // Base duration
  const baseDuration = (wordCount / indonesianAvgWPM) * 60000

  // Factor in punctuation pauses
  const punctuation = text.match(/[.,!?;:]/g) || []
  const pauseFactor = punctuation.length * 0.15 // Each punctuation = 150ms pause

  const withPauses = baseDuration + pauseFactor * 1000

  // Add realistic variance (±5%)
  const variance = (Math.random() - 0.5) * 0.1
  const finalDuration = withPauses * (1 + variance)

  // Minimum duration untuk clarity
  return Math.max(finalDuration, 800)
}

function startLipSyncAdvanced(durationMs, intensity = 1.0) {
  if (lipSyncInterval) clearInterval(lipSyncInterval)

  isSpeaking.value = true
  const startTime = Date.now()
  const mouthOpenRange = [0.2, 0.8]

  lipSyncInterval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / durationMs, 1.0)

    if (model && model.internalModel && progress < 1.0) {
      try {
        const mouthParam = model.internalModel.coreModel?.getParamIndex('PARAM_MOUTH_OPEN_Y') ?? -1

        if (mouthParam !== -1) {
          // Sine wave untuk natural mouth movement
          const mouthOpen =
            mouthOpenRange[0] +
            (mouthOpenRange[1] - mouthOpenRange[0]) *
              (0.5 + 0.5 * Math.sin(progress * Math.PI * 8 - Math.PI / 2))

          model.internalModel.coreModel.setParamFloat(mouthParam, mouthOpen * intensity)
        }
      } catch (e) {
        console.warn('Lip sync failed:', e)
      }
    } else {
      stopLipSyncAdvanced()
    }
  }, 50) // More frequent updates untuk smoothness
}

function stopLipSyncAdvanced() {
  if (lipSyncInterval) {
    clearInterval(lipSyncInterval)
    lipSyncInterval = null
  }

  isSpeaking.value = false

  if (model && model.internalModel) {
    try {
      const mouthParam = model.internalModel.coreModel?.getParamIndex('PARAM_MOUTH_OPEN_Y') ?? -1
      if (mouthParam !== -1) {
        model.internalModel.coreModel.setParamFloat(mouthParam, 0)
      }
    } catch (e) {
      // ignore
    }
  }
}

// ========== MICRO-EXPRESSION SYSTEM ==========
function triggerBlink(duration = 100) {
  if (!model || !model.internalModel) return

  try {
    const eyeParam = model.internalModel.coreModel?.getParamIndex('PARAM_EYE_OPEN_Y') ?? -1
    if (eyeParam !== -1) {
      model.internalModel.coreModel.setParamFloat(eyeParam, 0)
      setTimeout(() => {
        model.internalModel.coreModel.setParamFloat(eyeParam, 1)
      }, duration)
    }
  } catch (e) {
    console.warn('Blink failed:', e)
  }
}

function addMicroExpression(emotionCategory) {
  const microExpressions = {
    positive_high: () => {
      triggerBlink()
      setTimeout(() => triggerHeadNod(), 100)
    },
    negative_high: () => {
      triggerSlowBlink()
    },
    curious: () => {
      triggerQuickBlink()
      playMotion('flick_head')
    },
    default: () => {
      // subtle blink only
      triggerBlink(80)
    },
  }

  const microFunc = microExpressions[emotionCategory] || (() => {})
  microFunc()
}

function triggerSlowBlink(duration = 200) {
  triggerBlink(duration)
}

function triggerQuickBlink() {
  if (!model || !model.internalModel) return

  try {
    const eyeParam = model.internalModel.coreModel?.getParamIndex('PARAM_EYE_OPEN_Y') ?? -1
    if (eyeParam !== -1) {
      model.internalModel.coreModel.setParamFloat(eyeParam, 0)
      setTimeout(() => {
        model.internalModel.coreModel.setParamFloat(eyeParam, 1)
      }, 50)
    }
  } catch (e) {
    console.warn('Quick blink failed:', e)
  }
}

function triggerHeadNod() {
  try {
    playMotion('flick_head')
  } catch (e) {
    console.warn('Head nod failed:', e)
  }
}

// ========== MOTION LAYERING ==========
const motionMap = {
  f02: { motions: ['tap_body', 'idle'], weight: 0.7 }, // Happy - playful
  f03: { motions: ['idle'], weight: 0.3 }, // Sad - subtle
  f04: { motions: ['flick_head', 'shake'], weight: 0.6 }, // Surprised - expressive
  f01: { motions: ['idle'], weight: 0.2 }, // Neutral - minimal
}

async function playEmotionalResponse(expressionKey, intensity = 1.0) {
  const config = motionMap[expressionKey] || motionMap.f01

  // Queue expression change dengan smooth transition
  queueExpression(expressionKey, 300)

  // Play gesture jika intensity cukup tinggi
  if (intensity > 0.6 && config.motions.length > 0) {
    const motionIndex = Math.floor(Math.random() * config.motions.length)
    try {
      playMotion(config.motions[motionIndex])
    } catch (e) {
      console.warn('Motion play failed:', e)
    }
  }

  // Trigger micro-expression jika intensity tinggi
  if (intensity > 0.8) {
    const emotionMap = {
      f02: 'positive_high',
      f03: 'negative_high',
      f04: 'curious',
      f01: 'default',
    }
    addMicroExpression(emotionMap[expressionKey] || 'default')
  }
}

// ========== SCRIPT LOADING ==========
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

// ========== LIVE2D SETUP & UTILITIES ==========
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

function setExpressionDirect(expressionName) {
  if (!model) return

  try {
    if (expressionName === 'default' || expressionName === 'f01') {
      model.expression()
    } else {
      model.expression(expressionName)
    }
  } catch (e) {
    console.warn('Expression setting failed:', e)
    model.expression()
  }
}

function playMotion(motionName) {
  if (!model) return

  try {
    model.motion(motionName)
  } catch (e) {
    console.warn('Motion failed:', e)
  }
}

// ========== MAIN INTERACTION HANDLER ==========
const onSubmit = async () => {
  if (prompt.value.trim() === '' || isTyping.value) return

  const userMessage = prompt.value

  // Get detailed emotion analysis dari user input (HANYA SEKALI)
  const moodData = await answersStore.adjustMoodContext(userMessage)
  emotionIntensity.value = moodData.emotion.intensity

  answersStore.addAnswer('user', userMessage)
  prompt.value = ''

  isTyping.value = true

  try {
    console.log('📊 Mood updated:', moodData.mood, 'Intensity:', moodData.emotion.intensity)

    // Build dynamic system prompt based on mood
    const messagesWithDynamicPrompt = answersStore.getMessagesWithMood()
    console.log('🎯 System prompt updated with context')

    // Call Groq dengan dynamic prompt
    const response = await getRespondAnswer(messagesWithDynamicPrompt)
    let assistantMessage = response.choices[0].message.content

    // Humanize response
    assistantMessage = await humanizeResponse(assistantMessage)

    // Get advanced expression detection dengan blending info
    expressionBlend.value = await answersStore.detectExpressionAdvanced(assistantMessage)
    emotionIntensity.value = expressionBlend.value.intensity

    console.log('🎭 Expression blend:', expressionBlend.value)

    // Play emotional response dengan motion layering
    await playEmotionalResponse(expressionBlend.value.primary, expressionBlend.value.blendStrength)

    // Start advanced lip-sync dengan optimized duration
    const speakingDuration = calculateOptimalLipSyncDuration(assistantMessage)
    const wordCount = assistantMessage.trim().split(/\s+/).length
    console.log(`🎙️ Lip sync duration: ${speakingDuration.toFixed(0)}ms for ${wordCount} words`)
    startLipSyncAdvanced(speakingDuration, expressionBlend.value.intensity)

    setTimeout(
      () => {
        answersStore.addAnswer('assistant', assistantMessage)
        isTyping.value = false

        setTimeout(() => {
          stopLipSyncAdvanced()
        }, 500)
      },
      Math.max(speakingDuration, 1000),
    )
  } catch (error) {
    console.error('Error:', error)
    isTyping.value = false
    stopLipSyncAdvanced()

    showToast(`⚠️ ${error.message || 'Connection error'}`, 'warning', 3000)

    const offlineMessage = await answersStore.getOfflineResponse()
    answersStore.addAnswer('assistant', offlineMessage)

    // Show surprised expression on error
    await playEmotionalResponse('f04', 0.7)
  }
}

// ========== ANIMATION LOOP ==========
function startAnimationLoop() {
  function loop() {
    updateExpressions()
    animationFrameId = requestAnimationFrame(loop)
  }
  loop()
}

// ========== LIFECYCLE ==========
onMounted(async () => {
  // Initialize WASM
  await answersStore.initializeWasm()
  console.log('✅ WASM enabled:', answersStore.wasmEnabled)

  // ========== MONITOR WASM STATUS ==========
  watch(
    () => answersStore.wasmEnabled,
    (enabled) => {
      if (!enabled) {
        showToast('⚠️ Emotion detection offline, using basic analysis', 'warning', 3000)
      } else {
        showToast('✅ Emotion detection enabled', 'success', 2000)
      }
    },
  )

  // ========== LOAD MOOD PROFILE ==========
  answersStore.sessionStartTime = Date.now()
  await answersStore.loadMoodProfile()
  console.log('📊 Session mood profile initialized')

  // Start animation loop
  startAnimationLoop()

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
      backgroundColor: 0x262626,
      transparent: false,
    })

    model = await live2d.Live2DModel.from(modelUrl)
    app.stage.addChild(model)

    const scaleX = (window.innerWidth * 0.5) / model.width
    const scaleY = (window.innerHeight * 0.5) / model.height
    model.scale.set(Math.min(scaleX, scaleY))

    model.x = window.innerWidth / 2 - model.width / 2
    model.y = window.innerHeight * 0.05

    addFrame(model)
    addHitAreaFrames(model)
    model.interactive = true

    model.on('hit', (hitAreas) => {
      if (hitAreas.includes('body') || hitAreas.includes('Body')) {
        try {
          playMotion('tap_body')
          queueExpression('f02', 200)
        } catch (e) {
          console.warn('Hit interaction failed:', e)
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

onBeforeUnmount(async () => {
  await answersStore.saveMoodProfile()
  console.log('💾 Mood profile saved on exit')

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  stopLipSyncAdvanced()

  if (model) {
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

watch(showModelFrames, (v) => {
  if (model?._live2d_frame) model._live2d_frame.visible = v
})

watch(showHitAreaFrames, (v) => {
  if (model?._live2d_hitAreaFrames) model._live2d_hitAreaFrames.visible = v
})

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
    background: var(--accent-color-2);
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
      background: var(--accent-color-2);
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
      background: var(--bg-color);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--accent-color);
      border-radius: 4px;

      &:hover {
        background: var(--accent-color-2);
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

  // ===== TOAST NOTIFICATIONS =====
  &__toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    font-size: 0.95rem;
    z-index: 1000;
    backdrop-filter: blur(10px);
    animation: slideUp 0.3s ease;

    &--success {
      background: rgba(34, 197, 94, 0.9);
      border-left: 4px solid #22c55e;
    }

    &--warning {
      background: rgba(234, 179, 8, 0.9);
      border-left: 4px solid #eab308;
    }

    &--error {
      background: rgba(239, 68, 68, 0.9);
      border-left: 4px solid #ef4444;
    }

    &--info {
      background: rgba(59, 130, 246, 0.9);
      border-left: 4px solid #3b82f6;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .toast-slide-enter-active,
  .toast-slide-leave-active {
    transition: all 0.3s ease;
  }

  .toast-slide-enter-from,
  .toast-slide-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
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
