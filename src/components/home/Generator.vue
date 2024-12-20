<script setup>
import ChatWidget from '../common/ChatWidget.vue'
</script>

<template>
  <!-- <section class="generator">
    <div class="generator__content">
      <button class="generator__system-btn">
        <span>+</span>
        Add System Role
      </button>
      <div class="generator__input-container">
        <input type="text" placeholder="Enter something..." class="generator__input" />
        <button class="generator__send-btn">Send</button>
        <button class="generator__clipboard-btn">
          <span>Clipboard</span>
        </button>
      </div>
    </div>
  </section> -->

  <ChatWidget />
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
