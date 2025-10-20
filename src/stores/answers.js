// stores/answers.js
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

export const useAnswersStore = defineStore('answers', {
  state: () => ({
    displayAnswers: [],
    currentMood: 'chill',
    wasmEnabled: false,

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
    // Initialize WASM on store creation
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

    getMessagesWithMood() {
      const moodContext = {
        chill: '\n[Current vibe: Santai, casual chat mode]',
        playful: '\n[Current vibe: Lagi fun mode, boleh receh]',
        reflective: '\n[Current vibe: User lagi butuh empati, be supportive]',
      }

      const messages = [...this.systemMessages]

      if (messages[0]?.role === 'system') {
        messages[0].content += moodContext[this.currentMood]

        // Add dominant mood context if WASM available
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

    // WASM-powered mood detection with JS fallback
    async adjustMoodContext(userInput) {
      const lowerInput = userInput.toLowerCase()

      if (this.wasmEnabled && wasmCore) {
        // 🦀 Use WASM for preprocessing + mood detection
        try {
          // Preprocess input
          const preprocessed = wasmCore.preprocess_input(userInput)
          console.log('🦀 Preprocessed:', preprocessed)

          // Calculate sentiment
          const sentimentScore = wasmCore.calculate_sentiment(userInput)
          console.log('🦀 Sentiment score:', sentimentScore)

          // Detect mood with sentiment awareness
          this.currentMood = wasmCore.detect_mood(userInput)
          console.log('🦀 WASM mood detected:', this.currentMood)

          // Check if mood should transition
          const newMood = wasmCore.calculate_mood_transition(this.currentMood, sentimentScore)
          if (newMood !== this.currentMood) {
            console.log('🦀 Mood transitioning:', this.currentMood, '→', newMood)
            this.currentMood = newMood
          }

          return this.currentMood
        } catch (error) {
          console.warn('WASM mood detection failed, using JS fallback', error)
        }
      }

      // 🟨 JavaScript Fallback
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
      ]

      if (reflectiveKeywords.some((kw) => lowerInput.includes(kw))) {
        this.currentMood = 'reflective'
      } else if (playfulKeywords.some((kw) => lowerInput.includes(kw))) {
        this.currentMood = 'playful'
      } else {
        this.currentMood = 'chill'
      }

      return this.currentMood
    },

    // WASM-powered expression detection
    async detectExpression(text) {
      if (this.wasmEnabled && wasmCore) {
        try {
          return wasmCore.detect_expression(text)
        } catch (error) {
          console.warn('WASM expression detection failed', error)
        }
      }

      // JS Fallback
      const lowerText = text.toLowerCase()
      const expressionMap = {
        happy: ['senang', 'haha', 'wkwk', 'lucu', 'mantap', 'seru'],
        sad: ['sedih', 'galau', 'down', 'nangis'],
        surprised: ['wow', 'gila', 'astaga', 'serius', 'beneran'],
      }

      for (const [expression, keywords] of Object.entries(expressionMap)) {
        if (keywords.some((keyword) => lowerText.includes(keyword))) {
          return expression
        }
      }

      return 'default'
    },

    // Extract topics from conversation
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

    // Get mini-game riddle
    async getMinigameRiddle() {
      if (this.wasmEnabled && wasmCore) {
        try {
          const riddle = wasmCore.generate_riddle()
          return riddle
        } catch (error) {
          console.warn('WASM riddle generation failed', error)
        }
      }

      // JS Fallback
      const riddles = [
        { question: 'Apa yang naik tapi gak pernah turun?', answer: 'umur' },
        { question: 'Dibanting ga marah, malah seneng. Apa itu?', answer: 'bola' },
      ]
      return riddles[Math.floor(Math.random() * riddles.length)]
    },

    // Get offline response
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
  },
})

// ===== RESPONSE HUMANIZER (WASM-powered) =====
export async function humanizeResponse(response) {
  // Try WASM first
  if (wasmReady && wasmCore) {
    try {
      const result = wasmCore.humanize_response(response)
      console.log('🦀 WASM humanize used')
      return result
    } catch (error) {
      console.warn('WASM humanize failed, using JS fallback', error)
    }
  }

  // 🟨 JavaScript Fallback
  let humanized = response

  const replacements = {
    'Saya memahami': 'Aku ngerti',
    'Saya mengerti': 'Iya paham',
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

// Export wasmCore for debugging (optional)
export function getWasmCore() {
  return wasmCore
}
