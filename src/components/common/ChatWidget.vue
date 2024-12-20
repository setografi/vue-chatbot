<template>
  <section class="generator">
    <div class="generator__content">
      <div class="messages" ref="messagesContent">
        <div class="messages-content" ref="messagesContentDiv"></div>
      </div>

      <div class="generator__input-container">
        <textarea
          v-model="messageInput"
          placeholder="Type message..."
          class="generator__input"
        ></textarea>
        <button @click="handleSendMessage" class="generator__send-btn">Send</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { fakeMessages } from '@/constants/fakeMessages'

const messageInput = ref('')
const currentMessageIndex = ref(0)
const messagesContent = ref(null)

const scrollToBottom = () => {
  if (messagesContent.value) {
    messagesContent.value.scrollTop = messagesContent.value.scrollHeight
  }
}

const setDate = (messageDiv) => {
  const date = new Date()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const timestampDiv = document.createElement('div')
  timestampDiv.classList.add(
    'timestamp',
    'absolute',
    'bottom-[-20px]',
    'text-xs',
    'text-neutral-500',
    'right-7',
  )
  timestampDiv.textContent = `${hours}:${minutes < 10 ? '0' : ''}${minutes}`
  messageDiv.appendChild(timestampDiv)
}

const animateReadIcon = (checkmarkDiv) => {
  setTimeout(() => {
    checkmarkDiv.classList.replace('text-neutral-500', 'text-blue-500')
  }, 800)
}

const insertPersonalMessage = (msg) => {
  if (!messagesContent.value) return

  const messageDiv = document.createElement('div')
  messageDiv.classList.add(
    'message',
    'message-personal',
    'self-end',
    'bg-accent-color',
    'border',
    'border-accent-color',
    'p-2',
    'rounded-2xl',
    'rounded-tr-none',
    'max-w-[80%]',
    'relative',
    'ml-auto',
  )
  messageDiv.textContent = msg

  const checkmarkDiv = document.createElement('i')
  checkmarkDiv.classList.add(
    'ri-check-double-line',
    'absolute',
    'bottom-[-22px]',
    'right-2',
    'text-base',
    'text-neutral-500',
  )
  messageDiv.appendChild(checkmarkDiv)

  messagesContent.value.appendChild(messageDiv)
  setDate(messageDiv)
  scrollToBottom()

  animateReadIcon(checkmarkDiv)
}

const insertFakeMessage = () => {
  if (!messagesContent.value) return

  const typingIndicator = document.createElement('div')
  typingIndicator.classList.add(
    'message',
    'message-received',
    'self-start',
    'typing-indicator-container',
    'flex',
    'items-center',
  )
  const typingDots = document.createElement('div')
  typingDots.classList.add('typing-indicator', 'flex', 'space-x-1')

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span')
    dot.classList.add('h-2', 'w-2', 'bg-neutral-500', 'rounded-full', 'animate-bounce')
    dot.style.animationDelay = `${i * 0.2}s`
    typingDots.appendChild(dot)
  }

  typingIndicator.appendChild(typingDots)
  messagesContent.value.appendChild(typingIndicator)
  scrollToBottom()

  setTimeout(() => {
    typingIndicator.remove()

    const messageDiv = document.createElement('div')
    messageDiv.classList.add(
      'message',
      'message-received',
      'self-start',
      'bg-neutral-900',
      'border',
      'border-neutral-200',
      'p-2',
      'rounded-2xl',
      'rounded-tl-none',
      'max-w-[80%]',
      'relative',
    )
    messageDiv.textContent = fakeMessages[currentMessageIndex.value]
    messagesContent.value.appendChild(messageDiv)
    setDate(messageDiv)
    scrollToBottom()

    currentMessageIndex.value = (currentMessageIndex.value + 1) % fakeMessages.length
  }, 1500)
}

const handleSendMessage = () => {
  const msg = messageInput.value.trim()
  if (msg) {
    insertPersonalMessage(msg)
    messageInput.value = ''
    setTimeout(() => {
      insertFakeMessage()
    }, 1000)
  }
}

onMounted(() => {
  setTimeout(() => {
    insertFakeMessage()
  }, 1000)
})
</script>

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

  &__system-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-color);
    padding: 0.5rem 1rem;
    border-radius: 4px;
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
    font-size: 1rem;
    padding: 1rem;
    border-radius: 8px;

    &:focus {
      outline: none;
    }
  }

  &__send-btn {
    background: var(--primary-color);
    color: var(--text-color);
    border: none;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }
  }

  &__clipboard-btn {
    background: var(--primary-color);
    border: none;
    color: var(--text-color);
    padding: 1rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }
  }
}
</style>
