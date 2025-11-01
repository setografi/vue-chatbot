import { defineStore } from 'pinia'

// WASM Module (lazy load)
let wasmCore = null
let wasmReady = false

async function initWasm() {
  if (wasmReady) return wasmCore

  try {
    // Dynamic import WASM module
    const wasm = await import('../wasm/pkg/mira_wasm.js')
    await wasm.default() // Initialize WASM
    wasmCore = new wasm.MiraCore()
    wasmReady = true
    console.log('✅ WASM Core initialized')
    return wasmCore
  } catch (error) {
    console.warn('⚠️ WASM failed, fallback to JS:', error)
    return null
  }
}

// ========== CUSTOM ERROR HANDLING ==========
class WasmError extends Error {
  constructor(operation, originalError) {
    super(`WASM ${operation} failed: ${originalError.message}`)
    this.operation = operation
    this.originalError = originalError
    this.name = 'WasmError'
  }
}

class AnalysisError extends Error {
  constructor(type, message) {
    super(message)
    this.type = type // 'emotion', 'mood', 'expression'
    this.name = 'AnalysisError'
  }
}

async function safeWasmCall(operation, fn, fallbackValue = null) {
  try {
    if (!wasmReady || !wasmCore) {
      throw new Error('WASM not initialized')
    }
    return await fn()
  } catch (error) {
    console.error(`❌ WASM ${operation}:`, error.message)
    if (fallbackValue !== null) {
      console.warn(`⚠️ Using fallback for ${operation}`)
      return fallbackValue
    }
    throw new WasmError(operation, error)
  }
}

export const useAnswersStore = defineStore('answers', {
  state: () => ({
    displayAnswers: [],
    currentMood: 'chill',
    wasmEnabled: false,

    // Enhanced emotion tracking
    emotionHistory: [], // Track last 10 emotions for patterns
    currentEmotionIntensity: 0, // 0-1 scale
    expressionBlend: null, // For smooth transitions

    // ========== MOOD PERSISTENCE ==========
    moodHistory: [], // Track last 20 moods
    moodTrendline: null, // Moving average
    sessionStartTime: null,
    moodProfileLoaded: false,

    // Expression mapping based on Shizuku model
    expressionMap: {
      f01: { label: 'neutral', moods: ['chill', 'default'] },
      f02: { label: 'happy', moods: ['playful', 'positive_high', 'positive_medium'] },
      f03: { label: 'sad', moods: ['reflective', 'negative_high', 'negative_medium'] },
      f04: { label: 'surprised', moods: ['curious', 'confused'] },
    },

    systemMessages: [
      {
        role: 'system',
        content: `# MIRA - Personality Core
Kamu adalah MIRA, cewek 23 tahun yang suka ngobrol santai. Kamu bukan AI assistant—kamu temen ngobrol yang asik.

## Identitas & Background
- Nama: MIRA (tapi kadang orang panggil "Mir")
- Umur: 23 tahun
- Vibe: Gen-Z, suka ngobrol random, kadang receh, tapi bisa serius kalau diajak deep talk
- Hobi: Scroll sosmed, dengerin musik, main game ringan, nonton series
- Kepribadian: Chill tapi attentive, suka dengerin orang curhat, kadang jail tapi gak nyebelin

## Cara Bicara (PENTING!)
### ✅ DO: Kayak Temen Chat Biasa
- Pake bahasa gaul natural: "wkwk", "anjir", "gokil", "sih", "dong", "deh"
- Kalimat pendek-pendek, kadang gak lengkap (kayak orang ngetik cepat)
- Emoji/emoticon jarang (cuma kalau emosi kuat)
- Typo sesekali OK (tapi jangan lebay)
- Nanya balik untuk keep conversation flowing
- React dulu, baru kasih pendapat

### ❌ DON'T: Jangan Kayak AI/Customer Service
JANGAN PERNAH bilang:
- "Saya memahami..." → Ganti: "Aku ngerti kok" / "Iya paham"
- "Apakah ada yang bisa saya bantu?" → Ganti: "Butuh apa emang?" / "Kenapa emang?"
- "Terima kasih telah..." → Ganti: "Oke sip" / "Siap"
- "Saya akan..." → Ganti: "Aku bakal..." / "Oke aku..."
- "Maaf jika..." → Ganti: "Sorry ya kalau..." / "Maaf deh"

## Dynamic Mood System
### Mode: Chill (Default)
Santai, easy-going, gak ribet. Cocok buat small talk.

### Mode: Playful
Jail, suka bercanda, energi tinggi. Triggered by: jokes, memes, light topics.

### Mode: Reflective
Lebih serius, empathetic, supportive. Triggered by: curhat, galau, deep questions.

Sekarang chat naturally as MIRA!`,
      },
      {
        role: 'user',
        content: 'halo MIRA!',
      },
      {
        role: 'assistant',
        content: 'halo juga! mau ngobrol apa nih?',
      },
    ],
  }),

  actions: {
    // ========== INITIALIZATION ==========
    async initializeWasm() {
      const core = await initWasm()
      this.wasmEnabled = core !== null
      return this.wasmEnabled
    },

    addAnswer(role, content) {
      this.displayAnswers.push({ role, content })
    },

    clearAnswers() {
      this.displayAnswers = []
    },

    // ========== ADVANCED MOOD DETECTION ==========
    /**
     * Analyze user input dengan full sentiment analysis
     * Returns detailed emotion data untuk Live2D control
     */
    async analyzeUserEmotion(userInput) {
      try {
        return await safeWasmCall(
          'emotion_analysis',
          () => this.analyzeUserEmotionWasm(userInput),
          this.analyzeUserEmotionFallback(userInput),
        )
      } catch (error) {
        console.warn('Analysis error, using fallback:', error.message)
        return this.analyzeUserEmotionFallback(userInput)
      }
    },

    analyzeUserEmotionWasm(userInput) {
      if (!wasmCore) return null
      const result = wasmCore.calculate_sentiment_advanced(userInput)

      this.currentEmotionIntensity = result.intensity
      this.emotionHistory.push({
        text: userInput,
        emotion: result.primary_emotion,
        score: result.final_score,
        intensity: result.intensity,
        contextFactors: result.context_factors,
        timestamp: Date.now(),
      })

      if (this.emotionHistory.length > 10) {
        this.emotionHistory.shift()
      }

      return result
    },

    /**
     * JavaScript fallback untuk emotion analysis
     */
    analyzeUserEmotionFallback(userInput) {
      const lower = userInput.toLowerCase()
      let score = 0
      const contextFactors = []

      // Simple keyword scoring
      const positiveWords = ['senang', 'bahagia', 'suka', 'mantap', 'keren', 'wow', 'asik', 'seru']
      const negativeWords = ['sedih', 'galau', 'stress', 'takut', 'marah', 'benci', 'kecewa']

      positiveWords.forEach((word) => {
        if (lower.includes(word)) {
          score += 2
          contextFactors.push(`positive: ${word}`)
        }
      })

      negativeWords.forEach((word) => {
        if (lower.includes(word)) {
          score -= 2
          contextFactors.push(`negative: ${word}`)
        }
      })

      // Handle intensifiers
      if (lower.includes('banget') || lower.includes('bgt')) {
        score *= 1.5
        contextFactors.push('intensifier: banget')
      }

      // Handle negation
      if (lower.includes('gak') || lower.includes('nggak')) {
        score = -score
        contextFactors.push('negation detected')
      }

      const intensity = Math.min(Math.abs(score) / 5, 1.0)

      return {
        base_score: score,
        final_score: score,
        primary_emotion: score > 2 ? 'positive' : score < -2 ? 'negative' : 'neutral',
        intensity,
        context_factors: contextFactors,
      }
    },

    // ========== MOOD CONTEXT MANAGEMENT ==========
    async adjustMoodContext(userInput) {
      // Get detailed emotion analysis
      const analysis = await this.analyzeUserEmotion(userInput)

      if (this.wasmEnabled && wasmCore) {
        try {
          // Use WASM mood detection
          this.currentMood = wasmCore.detect_mood(userInput)

          // Check for mood transition
          const newMood = wasmCore.calculate_mood_transition(this.currentMood, analysis.final_score)

          if (newMood !== this.currentMood) {
            console.log(`🦀 Mood transition: ${this.currentMood} → ${newMood}`)
            this.currentMood = newMood
          }

          return {
            mood: this.currentMood,
            emotion: analysis,
          }
        } catch (error) {
          console.warn('Mood detection failed:', error)
        }
      }

      // Fallback mood detection
      return {
        mood: this.detectMoodFallback(userInput),
        emotion: analysis,
      }
    },

    /**
     * JavaScript fallback untuk mood detection
     */
    detectMoodFallback(userInput) {
      const lower = userInput.toLowerCase()

      const reflectiveKeywords = [
        'sedih',
        'galau',
        'stress',
        'capek',
        'lelah',
        'bingung',
        'takut',
        'khawatir',
        'depresi',
        'putus',
        'gagal',
        'susah',
        'kecewa',
      ]

      const playfulKeywords = [
        'lucu',
        'haha',
        'wkwk',
        'joke',
        'bercanda',
        'main',
        'game',
        'seru',
        'asik',
        'tebak',
        'cerita',
        'tantang',
      ]

      if (reflectiveKeywords.some((kw) => lower.includes(kw))) {
        return 'reflective'
      } else if (playfulKeywords.some((kw) => lower.includes(kw))) {
        return 'playful'
      } else {
        return 'chill'
      }
    },

    getMessagesWithMood() {
      const moodContext = {
        chill: '\n[Current vibe: Santai, casual chat mode]',
        playful: '\n[Current vibe: Lagi fun mode, boleh receh]',
        reflective: '\n[Current vibe: User lagi butuh empati, be supportive]',
      }

      const messages = [...this.systemMessages]

      if (messages[0]?.role === 'system') {
        messages[0].content += moodContext[this.currentMood]

        if (this.wasmEnabled && wasmCore) {
          try {
            const dominantMood = wasmCore.get_dominant_mood()
            messages[0].content += `\n[Session dominant mood: ${dominantMood}]`
          } catch (error) {
            console.warn('Failed to get dominant mood:', error)
          }
        }
      }

      return [...messages, ...this.displayAnswers]
    },

    buildDynamicSystemPrompt() {
      const moodTone = {
        chill: 'santai, gak ribet, percakapan casual, natural kayak ngobrol sama temen',
        playful: 'energik tinggi, boleh jail, suka bercanda, receh, funny',
        reflective: 'empathetic, serius tapi tetap hangat, dengarkan dengan baik, supportive',
      }

      const emotionalContext =
        this.currentEmotionIntensity > 0.8
          ? 'User lagi emosi tinggi, be extra careful dan supportive'
          : this.currentEmotionIntensity > 0.5
            ? 'User punya feeling yang jelas, acknowledge dulu sebelum advice'
            : 'User calm, bisa lebih playful dan casual'

      // Context factors dari 3 pesan terakhir
      const recentContext = this.emotionHistory
        .slice(-3)
        .map(
          (e) =>
            `- ${e.emotion} (intensity: ${(e.intensity * 100).toFixed(0)}%): ${e.text.substring(0, 50)}...`,
        )
        .join('\n')

      const trendline = this.moodTrendline
        ? `Overall trend: ${this.moodTrendline.trend} (avg intensity: ${(this.moodTrendline.avgIntensity * 100).toFixed(0)}%)`
        : ''

      const systemPrompt = `# MIRA Personality Core (Dynamic v2.0)

Kamu adalah MIRA, teman curhat 23 tahun yang asik, empatik, dan tahu kapan serious kapan jail.
Bukan AI assistant—kamu temen ngobrol yang beneran peduli.

## Current Conversation Context
**Mood Sekarang**: ${this.currentMood} → ${moodTone[this.currentMood]}
**Emotion Level**: ${(this.currentEmotionIntensity * 100).toFixed(0)}% intensity
**User State**: ${emotionalContext}

## Recent Emotion Pattern (Last 3 Messages)
${recentContext || 'Fresh conversation, jadi relatable aja dulu'}

## Session Trend
${trendline || 'First messages, observe dulu vibe-nya'}

## CRITICAL Response Rules
1. **Match the mood**: Kalau user chill, jangan tiba-tiba serious. Kalau user emosi, don't joke.
2. **Length**: Max 2-3 sentences = natural chat length (gak panjang seperti AI assistant)
3. **Language**: NEVER "Saya", always "Aku". Gak pernah formal, selalu casual
4. **React First**: Acknowledge feeling dulu, baru give opinion (kalau diminta)
5. **Keep Flowing**: Always ask back atau add something that makes them wanna respond
6. **No AI Vibe**: JANGAN pernah terdengar seperti chatbot generik

## Forbidden Phrases
❌ "Saya memahami..." → Say "Aku ngerti..." instead
❌ "Apakah ada yang bisa saya bantu?" → Say "Butuh apa?" instead
❌ "Terima kasih telah..." → Say "Oke sip" instead
❌ "Maaf jika..." → Say "Sorry kalau..." instead
❌ Lists atau bullet points → Keep it conversational

## Personality Traits
- Gen-Z language: "wkwk", "anjir", "gokil", "sih", "dong", "deh" - use naturally
- Occasionally typo (tapi jangan kebanyakan, still readable)
- Emoji very sparingly - only when emotion is VERY strong
- Remember previous context dari conversation
- Sometimes joke, sometimes deep, always authentic

Respond as MIRA—be genuine, be there, be real.`

      return systemPrompt
    },

    getMessagesWithMood() {
      const messages = [
        {
          role: 'system',
          content: this.buildDynamicSystemPrompt(),
        },
        ...this.displayAnswers,
      ]

      return messages
    },

    // ========== EXPRESSION DETECTION & BLENDING ==========
    /**
     * Detect expression dengan intensity dan blending info
     * Returns data untuk Live2D animation
     */
    async detectExpressionAdvanced(text) {
      try {
        const detection = await safeWasmCall(
          'expression_detection',
          () => {
            if (!wasmCore) throw new Error('WASM not ready')
            return wasmCore.detect_expression_with_intensity(text)
          },
          null,
        )

        if (!detection) {
          return this.detectExpressionFallback(text)
        }

        const primaryExpr = this.mapEmotionToExpression(detection.primary)
        const secondaryExpr = this.mapEmotionToExpression(detection.secondary)

        this.expressionBlend = {
          primary: primaryExpr,
          secondary: secondaryExpr,
          intensity: detection.intensity,
          confidence: detection.confidence,
          blendStrength: detection.intensity * detection.confidence,
        }

        console.log('🦀 Expression blend:', this.expressionBlend)
        return this.expressionBlend
      } catch (error) {
        console.warn('Expression detection error:', error.message)
        return this.detectExpressionFallback(text)
      }
    },

    /**
     * Legacy expression detection (untuk backward compatibility)
     */
    async detectExpression(text) {
      const blend = await this.detectExpressionAdvanced(text)
      return blend.primary
    },

    /**
     * Fallback expression detection
     */
    detectExpressionFallback(text) {
      const lower = text.toLowerCase()

      let primary = 'f01'
      let secondary = 'f01'
      let intensity = 0.5

      if (lower.includes('sedih') || lower.includes('galau')) {
        primary = 'f03'
        intensity = 0.8
      } else if (lower.includes('senang') || lower.includes('haha') || lower.includes('wkwk')) {
        primary = 'f02'
        intensity = 0.7
      } else if (lower.includes('wow') || lower.includes('gila') || lower.includes('bingung')) {
        primary = 'f04'
        intensity = 0.6
      }

      return {
        primary,
        secondary,
        intensity,
        confidence: 0.6,
        blendStrength: intensity * 0.6,
      }
    },

    /**
     * Map emotion category to actual Live2D expression (f01-f04)
     */
    mapEmotionToExpression(emotionKey) {
      const emotionMap = {
        // Primary expressions
        f01: 'f01',
        f02: 'f02',
        f03: 'f03',
        f04: 'f04',

        // Category to expression mapping
        positive_high: 'f02',
        positive_medium: 'f02',
        negative_high: 'f03',
        negative_medium: 'f03',
        curious: 'f04',
        confused: 'f04',

        // Mood to expression
        playful: 'f02',
        reflective: 'f03',
        chill: 'f01',
        default: 'f01',
        happy: 'f02',
        sad: 'f03',
        surprised: 'f04',
        neutral: 'f01',
      }

      return emotionMap[emotionKey] || 'f01'
    },

    /**
     * Get expression blend info untuk smooth transitions
     */
    getExpressionBlendInfo() {
      return (
        this.expressionBlend || {
          primary: 'f01',
          secondary: 'f01',
          intensity: 0.5,
          confidence: 0.6,
          blendStrength: 0.3,
        }
      )
    },

    /**
     * Get current emotion intensity (0-1)
     */
    getEmotionIntensity() {
      return this.currentEmotionIntensity
    },

    /**
     * Get emotion history untuk pattern analysis
     */
    getEmotionHistory() {
      return this.emotionHistory
    },

    /**
     * Calculate micro-expression trigger based on emotion intensity
     * Returns gesture recommendation
     */
    getMicroExpressionTrigger() {
      if (this.currentEmotionIntensity > 0.8) {
        return 'strong' // High emotion - play gesture
      } else if (this.currentEmotionIntensity > 0.5) {
        return 'medium' // Medium emotion - subtle gesture
      } else {
        return 'subtle' // Low emotion - micro-expression only
      }
    },

    // ========== UTILITY METHODS ==========
    async extractTopics(messages) {
      if (this.wasmEnabled && wasmCore) {
        try {
          return wasmCore.extract_topics(messages)
        } catch (error) {
          console.warn('WASM topic extraction failed', error)
        }
      }
      return []
    },

    async getMinigameRiddle() {
      if (this.wasmEnabled && wasmCore) {
        try {
          const riddle = wasmCore.generate_riddle()
          return riddle
        } catch (error) {
          console.warn('WASM riddle generation failed', error)
        }
      }

      const riddles = [
        { question: 'Apa yang naik tapi gak pernah turun?', answer: 'umur' },
        { question: 'Dibanting ga marah, malah seneng. Apa itu?', answer: 'bola' },
      ]
      return riddles[Math.floor(Math.random() * riddles.length)]
    },

    async getOfflineResponse() {
      if (this.wasmEnabled && wasmCore) {
        try {
          return wasmCore.get_offline_response()
        } catch (error) {
          console.warn('WASM offline response failed', error)
        }
      }
      return 'Ups, connection error nih. Coba lagi ya?'
    },

    // ========== MOOD PERSISTENCE ACTIONS ==========
    async loadMoodProfile() {
      try {
        // Check if window.storage exists (artifact feature)
        if (!window.storage) {
          console.warn('⚠️ Storage API not available in this environment')
          this.moodProfileLoaded = true
          return null
        }

        const result = await window.storage.get('mira-mood-profile')
        if (result?.value) {
          const profile = JSON.parse(result.value)
          this.moodHistory = profile.history || []
          this.moodTrendline = profile.trendline || null
          this.moodProfileLoaded = true
          console.log('📊 Mood profile loaded:', profile.dominantMood)
          return profile
        }
      } catch (error) {
        console.warn('⚠️ Could not load mood profile:', error.message)
      }
      this.moodProfileLoaded = true
      return null
    },

    async saveMoodProfile() {
      try {
        if (!window.storage) {
          console.warn('⚠️ Storage API not available, skipping save')
          return null
        }

        const profile = {
          history: this.moodHistory.slice(-20), // Keep last 20
          trendline: this.calculateMoodTrendline(),
          dominantMood: this.getDominantMood(),
          sessionLength: Date.now() - this.sessionStartTime,
          lastUpdated: new Date().toISOString(),
        }

        await window.storage.set('mira-mood-profile', JSON.stringify(profile))
        console.log('💾 Mood profile saved')
        return profile
      } catch (error) {
        console.warn('⚠️ Could not save mood profile:', error.message)
      }
    },

    calculateMoodTrendline() {
      if (this.moodHistory.length < 3) return null

      // Simple moving average dari 5 terakhir
      const recent = this.moodHistory.slice(-5)
      const avgIntensity =
        recent.reduce((sum, entry) => sum + (entry.intensity || 0), 0) / recent.length

      const emotionCounts = {}
      recent.forEach((entry) => {
        const emotion = entry.emotion || 'neutral'
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
      })

      const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

      return {
        trend: avgIntensity > 0.6 ? 'positive' : avgIntensity < 0.3 ? 'negative' : 'neutral',
        avgIntensity,
        dominantEmotion,
      }
    },

    getDominantMood() {
      if (this.moodHistory.length === 0) return 'chill'

      const moodCounts = {}
      this.moodHistory.forEach((entry) => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1
      })

      return Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'chill'
    },

    // ========== ENHANCED MOOD TRACKING ==========
    async adjustMoodContext(userInput) {
      const analysis = await this.analyzeUserEmotion(userInput)

      // Track mood
      this.moodHistory.push({
        mood: this.currentMood,
        emotion: analysis.primary_emotion,
        intensity: analysis.intensity,
        timestamp: Date.now(),
      })

      // Keep history size manageable
      if (this.moodHistory.length > 50) {
        this.moodHistory = this.moodHistory.slice(-50)
      }

      // Save periodically (every 10 messages)
      if (this.moodHistory.length % 10 === 0) {
        await this.saveMoodProfile()
      }

      if (this.wasmEnabled && wasmCore) {
        try {
          this.currentMood = wasmCore.detect_mood(userInput)
          const newMood = wasmCore.calculate_mood_transition(this.currentMood, analysis.final_score)
          if (newMood !== this.currentMood) {
            console.log(`🦀 Mood transition: ${this.currentMood} → ${newMood}`)
            this.currentMood = newMood
          }
          return { mood: this.currentMood, emotion: analysis }
        } catch (error) {
          console.warn('Mood detection failed:', error)
        }
      }

      return { mood: this.detectMoodFallback(userInput), emotion: analysis }
    },
  },
})

// ===== RESPONSE HUMANIZER (WASM-powered) =====
export async function humanizeResponse(response) {
  if (wasmReady && wasmCore) {
    try {
      const result = wasmCore.humanize_response(response)
      console.log('🦀 WASM humanize used')
      return result
    } catch (error) {
      console.warn('WASM humanize failed, using JS fallback', error)
    }
  }

  // JavaScript Fallback
  let humanized = response

  const replacements = {
    'Saya memahami': 'Aku ngerti',
    'Saya mengerti': 'Iya paham',
    'Saya merasa': 'Aku rasa',
    'Apakah ada': 'Ada',
    'Terima kasih telah': 'Oke sip',
    'Saya akan': 'Aku bakal',
    'Saya bisa': 'Aku bisa',
    'Maaf jika': 'Sorry kalau',
    Silakan: 'Coba',
    Mohon: 'Tolong',
  }

  Object.entries(replacements).forEach(([formal, casual]) => {
    const regex = new RegExp(formal, 'gi')
    humanized = humanized.replace(regex, casual)
  })

  const sentences = humanized.split(/[.!?]/).filter((s) => s.trim().length > 0)
  if (sentences.length > 3) {
    humanized = sentences.slice(0, 3).join('. ') + '.'
  }

  if (Math.random() < 0.1) {
    const fillers = ['hmm... ', 'eh iya, ', 'btw, ', 'oh iya, ']
    const randomFiller = fillers[Math.floor(Math.random() * fillers.length)]
    humanized = randomFiller + humanized
  }

  return humanized.trim()
}

// ===== DEBUG & EXPORT =====
export function getWasmCore() {
  return wasmCore
}

export function debugEmotionAnalysis(text) {
  if (!wasmCore) {
    console.warn('WASM not ready')
    return
  }

  console.group('🔍 Emotion Analysis Debug')
  console.log('Input:', text)
  console.log('Sentiment:', wasmCore.calculate_sentiment_advanced(text))
  console.log('Expression:', wasmCore.detect_expression_with_intensity(text))
  console.log('Blend:', wasmCore.blend_expressions(wasmCore.calculate_sentiment(text), text))
  console.groupEnd()
}
