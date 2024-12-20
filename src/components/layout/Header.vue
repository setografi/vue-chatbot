<template>
  <header class="header">
    <div class="header__logo">
      <img src="../../assets/logo.svg" alt="Bot Icon" />
      <h1>ChatAI <span>Demo</span></h1>
    </div>
    <div class="header__subtitle">Based on OpenAI API (gpt-3.5-turbo).</div>
  </header>
</template>

<style scoped lang="scss">
.header {
  text-align: start;
  padding: 2rem 0;

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

    h1 {
      font-size: 2rem;

      span {
        color: var(--accent-color);
      }
    }
  }

  &__subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }
}
</style>
