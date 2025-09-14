<template>
  <header class="header">
    <div class="header__logo">
      <img src="../../assets/logo.svg" alt="Bot Icon" />
      <div class="header__logo__title">
        <h1>MIRA</h1>
        <span>“Mindful Interactive Relaxed Assistant”</span>
      </div>
    </div>
    <div class="header__subtitle">Based on Openai/GPT.</div>
  </header>
</template>

<style scoped lang="scss">
.header {
  text-align: start;
  padding: 1rem 0rem 0.25rem 0rem;

  &__logo {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: start;
    gap: 1rem;
    margin-bottom: 2rem;

    img {
      width: 40px;
      height: 40px;
    }

    &__title {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;

      h1 {
        font-size: var(--font-size-3xl);
      }

      span {
        color: var(--accent-color);
      }
    }
  }

  &__subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: var(--font-size-base);
  }
}
</style>
