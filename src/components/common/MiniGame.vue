<template>
  <div v-if="isActive" class="mini-game">
    <div class="mini-game__overlay" @click="closeGame"></div>
    <div class="mini-game__container">
      <div class="mini-game__header">
        <h3>🎮 Tebak-tebakan!</h3>
        <button class="mini-game__close" @click="closeGame">
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

      <div class="mini-game__content">
        <!-- Question -->
        <div class="mini-game__question">
          <p>{{ currentRiddle?.question || 'Loading...' }}</p>
        </div>

        <!-- Score Display -->
        <div class="mini-game__score">
          <span>✅ Benar: {{ score.correct }}</span>
          <span>❌ Salah: {{ score.wrong }}</span>
          <span>🔥 Streak: {{ score.streak }}</span>
        </div>

        <!-- Answer Input -->
        <div v-if="!showResult" class="mini-game__input-area">
          <input
            v-model="userAnswer"
            type="text"
            placeholder="Ketik jawabanmu..."
            @keydown.enter="checkAnswer"
            :disabled="isChecking"
            ref="answerInput"
          />
          <button @click="checkAnswer" :disabled="!userAnswer.trim() || isChecking">
            {{ isChecking ? 'Checking...' : 'Jawab!' }}
          </button>
        </div>

        <!-- Result Display -->
        <div v-else class="mini-game__result" :class="isCorrect ? 'correct' : 'wrong'">
          <div class="mini-game__result-icon">
            {{ isCorrect ? '🎉' : '😅' }}
          </div>
          <p v-if="isCorrect"><strong>BENAR!</strong> Mantap banget! 🔥</p>
          <p v-else>
            <strong>Salah nih!</strong><br />
            Jawabannya: <strong>{{ currentRiddle?.answer }}</strong>
          </p>
          <button @click="nextRiddle" class="mini-game__next-btn">Lanjut Tebak-tebakan →</button>
        </div>

        <!-- Quit Button -->
        <button @click="quitGame" class="mini-game__quit-btn">Keluar dari Game</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAnswersStore } from '@/stores/answers'

const props = defineProps({
  isActive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'score-update'])

const answersStore = useAnswersStore()

// Game State
const currentRiddle = ref(null)
const userAnswer = ref('')
const showResult = ref(false)
const isCorrect = ref(false)
const isChecking = ref(false)
const answerInput = ref(null)

// Score Tracking
const score = ref({
  correct: 0,
  wrong: 0,
  streak: 0,
})

// Load riddle when game becomes active
watch(
  () => props.isActive,
  async (isActive) => {
    if (isActive) {
      await loadNewRiddle()
      // Focus input after render
      nextTick(() => {
        answerInput.value?.focus()
      })
    }
  },
)

// Load new riddle from WASM
async function loadNewRiddle() {
  showResult.value = false
  userAnswer.value = ''
  isChecking.value = false

  try {
    currentRiddle.value = await answersStore.getMinigameRiddle()
    // console.log('🎮 New riddle loaded:', currentRiddle.value?.question)
  } catch (error) {
    // console.error('Failed to load riddle:', error)
    currentRiddle.value = {
      question: 'Error loading riddle. Try again!',
      answer: 'error',
    }
  }
}

// Check user's answer
function checkAnswer() {
  if (!userAnswer.value.trim() || isChecking.value) return

  isChecking.value = true

  // Normalize answers for comparison
  const userAnswerNorm = userAnswer.value.toLowerCase().trim()
  const correctAnswerNorm = currentRiddle.value?.answer.toLowerCase().trim()

  isCorrect.value = userAnswerNorm === correctAnswerNorm

  // Update score
  if (isCorrect.value) {
    score.value.correct++
    score.value.streak++
  } else {
    score.value.wrong++
    score.value.streak = 0
  }

  // Emit score update
  emit('score-update', score.value)

  // Show result
  showResult.value = true
  isChecking.value = false
}

// Next riddle
async function nextRiddle() {
  await loadNewRiddle()
  nextTick(() => {
    answerInput.value?.focus()
  })
}

// Close game
function closeGame() {
  emit('close')
}

// Quit and reset
function quitGame() {
  if (confirm('Yakin mau keluar? Skor kamu akan di-reset.')) {
    score.value = { correct: 0, wrong: 0, streak: 0 }
    emit('close')
  }
}
</script>

<style lang="scss" scoped>
.mini-game {
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
  // animation: fadeIn 0.3s ease;
  padding: 1rem;

  // &__overlay {
  //   position: absolute;
  //   top: 0;
  //   left: 0;
  //   width: 100%;
  //   height: 100%;
  //   background: rgba(0, 0, 0, 0.7);
  //   backdrop-filter: blur(8px);
  // }

  &__container {
    // position: relative;
    background: var(--bg-color);
    border: 2px solid var(--accent-color);
    border-radius: 20px;
    width: 100%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    // box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 2px solid var(--accent-color);

    h3 {
      color: var(--bg-color);
      margin: 0;
      font-size: 1.5rem;
      // font-weight: 700;
    }
  }

  &__close {
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

  &__content {
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

  &__question {
    background: rgba(102, 126, 234, 0.1);
    border: 2px dashed var(--accent-color);
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;

    p {
      color: var(--text-color);
      font-size: 1.1rem;
      line-height: 1.6;
      margin: 0;
      text-align: center;
    }
  }

  &__score {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;

    span {
      color: var(--text-color);
      font-size: 0.9rem;
      font-weight: 600;
    }
  }

  &__input-area {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;

    input {
      flex: 1;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid var(--accent-color);
      color: var(--text-color);
      padding: 1rem 1.5rem;
      border-radius: 12px;
      font-size: 1rem;

      &::placeholder {
        color: rgba(255, 255, 255, 0.5);
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

    button {
      background: var(--accent-color-2);
      border: none;
      color: var(--bg-color);
      padding: 1rem 2rem;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover:not(:disabled) {
        background: var(--accent-color);
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  &__result {
    text-align: center;
    padding: 2rem;
    border-radius: 16px;
    margin-bottom: 1rem;
    animation: bounceIn 0.5s ease;

    &.correct {
      background: linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(16, 185, 129, 0.2));
      border: 2px solid #10b981;
    }

    &.wrong {
      background: linear-gradient(135deg, rgba(248, 113, 113, 0.2), rgba(239, 68, 68, 0.2));
      border: 2px solid #ef4444;
    }

    p {
      color: var(--text-color);
      font-size: 1.1rem;
      margin: 1rem 0;
    }
  }

  &__result-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: bounce 1s infinite;
  }

  &__next-btn {
    background: var(--accent-color-2);
    border: none;
    color: var(--bg-color);
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;

    &:hover {
      background: var(--accent-color);
      transform: scale(1.05);
    }
  }

  &__quit-btn {
    width: 100%;
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: var(--text-color);
    padding: 0.875rem;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.5);
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@media (max-width: 768px) {
  .mini-game {
    &__container {
      width: 95%;
      max-height: 90vh;
    }

    &__content {
      padding: 1.5rem;
    }

    &__question {
      padding: 1.5rem;
      min-height: 100px;

      p {
        font-size: 1rem;
      }
    }
  }
}
</style>
