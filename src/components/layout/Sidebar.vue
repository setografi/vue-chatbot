<template>
  <div class="app">
    <!-- Sidebar -->
    <div class="sidebar">
      <ul>
        <li>
          <i class="mira">
            <div class="mira__logo">
              <img src="../../assets/logo.svg" alt="Bot Icon" />
              <span>MIRA</span>
            </div>
            <div class="mira__subtitle">Based on Llama3.</div>
          </i>
        </li>
        <li :class="{ active: activePage === 'discover' }" @click="activePage = 'discover'">
          <i class="icon">⭐</i>
          <span>Discover</span>
        </li>
        <li :class="{ active: activePage === 'chats' }" @click="activePage = 'chats'">
          <i class="icon">💬</i>
          <span>Chats</span>
        </li>
        <li :class="{ active: activePage === 'profile' }" @click="activePage = 'profile'">
          <i class="icon">👤</i>
          <span>Profile</span>
        </li>
      </ul>
    </div>

    <!-- Main Content -->
    <div class="content">
      <Discover v-if="activePage === 'discover'" />
      <Chats v-if="activePage === 'chats'" />
      <Profile v-if="activePage === 'profile'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Discover from '@/pages/Discover.vue'
import Chats from '@/pages/Chats.vue'
import Profile from '@/pages/Profile.vue'

const activePage = ref('discover') // default halaman awal
</script>

<style scoped lang="scss">
.app {
  display: flex;
  height: 100vh;
  background-color: #f8f3eb;
}

.mira {
  text-align: start;
  padding: 1rem 0rem 0.25rem 0rem;

  &__logo {
    display: flex;
    flex-direction: column;
    align-items: start;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 0.5rem;

    img {
      width: 40px;
      height: 40px;
    }

    span {
      font-size: var(--font-size-2xl);
      color: var(--accent-color);
    }
  }

  &__subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: var(--font-size-base);
  }
}

.sidebar {
  background-color: #f8f3eb;
  width: 80px;
  padding: 1rem 0;
  border-right: 1px solid #e0d7cc;

  ul {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem 0;
      cursor: pointer;
      color: #5a4b41;
      font-size: 0.9rem;
      border-radius: 8px;

      .icon {
        font-size: 1.2rem;
        margin-bottom: 0.3rem;
      }

      &.active {
        background-color: #e6dfd6;
        font-weight: 600;
      }

      &:hover {
        background-color: #ede7df;
      }
    }
  }
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}
</style>
