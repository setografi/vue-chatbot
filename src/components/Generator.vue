<script setup>
import { nextTick, ref } from 'vue'
import { useAnswersStore } from '@/stores/answers'
import { getRespondAnswer } from '@/api/index'

const prompt = ref('')
const answersStore = useAnswersStore()

const onSubmit = async (e) => {
  e.preventDefault()
  if (prompt.value.trim() === '') return

  answersStore.addAnswer('user', prompt.value)

  try {
    const response = await getRespondAnswer(answersStore.getMessages())

    const assistantMessage = response.choices[0].message.content
    answersStore.addAnswer('assistant', assistantMessage)

    prompt.value = ''

    nextTick(() => {
      const chatContainer = document.querySelector('.generator__chat')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    })
  } catch (error) {
    console.error('Error:', error)
  }
}
</script>

<template>
  <section class="generator">
    <div class="generator__content">
      <button class="generator__system-btn">
        <span>+</span>
        Add System Role
      </button>

      <div class="generator__chat">
        <div
          v-for="(answer, index) in answersStore.displayAnswers"
          :key="index"
          class="generator__chat-message"
        >
          <h2 :class="['generator__role', answer.role === 'assistant' ? 'ai' : 'user']">
            {{ answer.role === 'assistant' ? 'Mira' : 'You' }}
          </h2>

          <p
            :class="[
              'generator__message',
              answer.role === 'assistant' ? 'ai-message' : 'user-message',
            ]"
          >
            {{ answer.content }}
          </p>
        </div>
      </div>

      <form @submit="onSubmit" class="generator__input-container">
        <input
          v-model="prompt"
          type="text"
          placeholder="Enter something..."
          class="generator__input"
        />
        <button class="generator__send-btn">Send</button>
        <button class="generator__clipboard-btn">
          <span>File</span>
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped lang="scss">
.generator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;

  &__content {
    width: 100%;
    max-width: 768px;
  }

  &__chat {
    // height: 5rem;
    max-height: 20rem;
    overflow-y: auto;
    // padding: 10px;
    // border-radius: 10px;
    // border: 1px solid rgba(255, 255, 255, 0.2);
    // margin-bottom: 1rem;

    .generator__chat-message {
      max-width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      margin: 1rem 0;

      .generator__role {
        font-size: var(--font-size-sm);
        font-weight: bold;
        padding: 0.25rem 0.75rem;

        &.ai {
          color: #fff;
          text-align: left;
        }
        &.user {
          color: #fff;
          text-align: right;
        }
      }

      .generator__message {
        max-width: 80%;
        word-wrap: break-word;
        font-size: var(--font-size-base);
        padding: 0.5rem 0.75rem;
        border-radius: 8px;

        &.ai-message {
          // background: var(--input-bg);
          color: #fff;
          text-align: left;
          align-self: flex-start;
        }

        &.user-message {
          background: var(--input-bg);
          color: #fff;
          text-align: right;
          align-self: flex-end;
        }
      }
    }
  }

  &__system-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-color);
    font-size: var(--font-size-sm);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  &__input-container {
    display: flex;
    gap: 0.5rem;
  }

  &__input {
    flex: 1;
    background: var(--input-bg);
    border: none;
    color: var(--text-color);
    font-size: var(--font-size-base);
    padding: 1rem;
    border-radius: 4px;

    &:focus {
      outline: none;
    }
  }

  &__send-btn {
    background: var(--primary-color);
    color: var(--text-color);
    font-size: var(--font-size-base);
    border: none;
    padding: 1rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }

  &__clipboard-btn {
    background: var(--primary-color);
    border: none;
    font-size: var(--font-size-base);
    color: var(--text-color);
    padding: 1rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }
}
</style>
